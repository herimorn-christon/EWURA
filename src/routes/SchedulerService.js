import cron from 'node-cron';
import { DatabaseManager } from '../database/DatabaseManager.js';
import { EWURAService } from './EWURAService.js';
import { ReportController } from '../controllers/ReportController.js';
import { refillDetectionService } from './interfaces/RefillDetectionService.js';
import { logger } from '../utils/logger.js';

/**
 * Scheduler Service
 * Handles automated report generation, EWURA submissions, and anomaly detection
 */
export class SchedulerService {
  constructor() {
    this.jobs = new Map();
    this.isInitialized = false;
    this.defaultSettings = {
      reportGenerationTime: '07:30',
      ewuraSendTime: '08:00',
      timezone: 'Africa/Dar_es_Salaam',
      autoGenerate: true,
      autoSendToEwura: true
    };
  }

  async initialize() {
    try {
      logger.info('Initializing Scheduler Service...');
      
      // Load settings from database
      await this.loadSettings();
      
      // Schedule jobs
      await this.scheduleJobs();
      
      this.isInitialized = true;
      logger.info('✅ Scheduler Service initialized');
    } catch (error) {
      logger.error('Scheduler Service initialization failed:', error);
      throw error;
    }
  }

  async loadSettings() {
    try {
      const result = await DatabaseManager.query(`
        SELECT key, value
        FROM system_settings
        WHERE category = 'report_generation'
      `);

      this.settings = { ...this.defaultSettings };
      
      result.rows.forEach(row => {
        try {
          this.settings[row.key.replace(/_([a-z])/g, (g) => g[1].toUpperCase())] = JSON.parse(row.value);
        } catch {
          this.settings[row.key.replace(/_([a-z])/g, (g) => g[1].toUpperCase())] = row.value;
        }
      });

      logger.info('Scheduler settings loaded:', this.settings);
    } catch (error) {
      logger.warn('Failed to load scheduler settings, using defaults:', error);
      this.settings = this.defaultSettings;
    }
  }

  async scheduleJobs() {
    // Stop existing jobs
    this.stopAllJobs();

    // Schedule daily report generation
    if (this.settings.autoGenerate) {
      const [hour, minute] = this.settings.reportGenerationTime.split(':');
      const cronExpression = `${minute} ${hour} * * *`; // Daily at specified time
      
      this.jobs.set('dailyReports', cron.schedule(cronExpression, async () => {
        await this.generateDailyReports();
      }, {
        scheduled: true,
        timezone: this.settings.timezone
      }));

      logger.info(`Scheduled daily report generation at ${this.settings.reportGenerationTime} (${this.settings.timezone})`);
    }

    // Schedule EWURA submissions
    if (this.settings.autoSendToEwura) {
      const [hour, minute] = this.settings.ewuraSendTime.split(':');
      const cronExpression = `${minute} ${hour} * * *`; // Daily at specified time
      
      this.jobs.set('ewuraSubmissions', cron.schedule(cronExpression, async () => {
        await this.sendPendingEwuraReports();
      }, {
        scheduled: true,
        timezone: this.settings.timezone
      }));

      logger.info(`Scheduled EWURA submissions at ${this.settings.ewuraSendTime} (${this.settings.timezone})`);
    }

    // Schedule hourly anomaly detection
    this.jobs.set('anomalyDetection', cron.schedule('0 * * * *', async () => {
      await this.detectAnomalies();
    }, {
      scheduled: true,
      timezone: this.settings.timezone
    }));

    // Schedule backup cleanup (daily at 3 AM)
    this.jobs.set('backupCleanup', cron.schedule('0 3 * * *', async () => {
      await this.cleanupOldBackups();
    }, {
      scheduled: true,
      timezone: this.settings.timezone
    }));

    logger.info('All scheduled jobs configured');
  }

  /**
   * Generate daily reports for all active stations
   */
  async generateDailyReports() {
    try {
      logger.info('Starting automated daily report generation...');
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const reportDate = yesterday.toISOString().split('T')[0];

      // Get all active stations
      const stationsResult = await DatabaseManager.query(`
        SELECT s.id, s.name, s.code, it.code as interface_code
        FROM stations s
        JOIN interface_types it ON s.interface_type_id = it.id
        WHERE s.is_active = true
      `);

      let successCount = 0;
      let errorCount = 0;

      for (const station of stationsResult.rows) {
        try {
          // Check if report already exists
          const existingReport = await DatabaseManager.query(`
            SELECT id FROM daily_reports 
            WHERE station_id = $1 AND report_date = $2
          `, [station.id, reportDate]);

          if (existingReport.rows.length > 0) {
            logger.info(`Report already exists for ${station.name} - ${reportDate}`);
            continue;
          }

          // Generate report data
          const reportData = await ReportController.generateReportData(
            station.id, 
            reportDate, 
            station.interface_code
          );

          // Store report
          const reportId = await ReportController.storeReport(station.id, reportDate, reportData);
          
          logger.info(`Generated daily report for ${station.name} - ${reportDate} (ID: ${reportId})`);
          successCount++;

        } catch (error) {
          logger.error(`Failed to generate report for ${station.name}:`, error);
          errorCount++;
        }
      }

      logger.info(`Daily report generation completed: ${successCount} success, ${errorCount} errors`);
    } catch (error) {
      logger.error('Automated daily report generation failed:', error);
    }
  }

  /**
   * Send pending reports to EWURA
   */
  async sendPendingEwuraReports() {
    try {
      logger.info('Starting automated EWURA submission...');

      // Get reports that haven't been sent to EWURA
      const pendingReports = await DatabaseManager.query(`
        SELECT 
          dr.*,
          s.name as station_name,
          s.code as station_code,
          s.ewura_license_no,
          t.tin as operator_tin,
          t.vrn as operator_vrn,
          t.business_name as operator_name
        FROM daily_reports dr
        JOIN stations s ON dr.station_id = s.id
        JOIN taxpayers t ON s.taxpayer_id = t.id
        WHERE dr.ewura_sent = false 
          AND dr.status = 'PROCESSED'
          AND dr.report_date >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY dr.report_date ASC
      `);

      let successCount = 0;
      let errorCount = 0;

      for (const report of pendingReports.rows) {
        try {
          // Prepare EWURA submission data
          const summaryData = {
            tranId: `RPT-${report.report_no}`,
            apiSourceId: `${report.operator_tin}_SPAdv2023T`,
            ewuraLicenseNo: report.ewura_license_no,
            retailStationName: report.station_name,
            serialNo: report.station_code,
            reportId: report.id,
            reportNo: report.report_no,
            startDate: report.report_date,
            endDate: report.report_date,
            countOfTransactions: report.number_of_transactions,
            totalNetAmount: report.total_amount - report.total_discount,
            totalDiscount: report.total_discount,
            totalAmount: report.total_amount,
            totalVolume: report.total_volume,
            // Add tank inventory from report data
            tankInventory: JSON.parse(report.tank_readings || '[]').map(tank => ({
              tankId: tank.tank_number,
              tankProdName: tank.product_name || 'Unknown',
              saleNumber: 0, // Calculate from transactions
              startVolume: tank.start_volume || 0,
              deliveryVolume: 0, // Calculate from refill events
              saleVolume: 0, // Calculate from transactions
              measuredEndVolume: tank.end_volume || 0,
              calculatedEndVolume: tank.start_volume - 0 + 0, // start - sales + delivery
              volumeDifference: 0
            }))
          };

          // Submit to EWURA
          const ewuraResult = await EWURAService.generateAndSubmitDailySummary(
            report.station_id,
            report.report_date,
            summaryData
          );

          // Mark as sent
          await DatabaseManager.query(`
            UPDATE daily_reports 
            SET ewura_sent = true, ewura_sent_at = NOW(), ewura_response = $1
            WHERE id = $2
          `, [JSON.stringify(ewuraResult), report.id]);

          logger.info(`EWURA submission successful for ${report.station_name} - ${report.report_date}`);
          successCount++;

        } catch (error) {
          logger.error(`EWURA submission failed for ${report.station_name}:`, error);
          
          // Update error status
          await DatabaseManager.query(`
            UPDATE daily_reports 
            SET ewura_error = $1, ewura_retry_count = COALESCE(ewura_retry_count, 0) + 1
            WHERE id = $2
          `, [error.message, report.id]);
          
          errorCount++;
        }
      }

      logger.info(`EWURA submission completed: ${successCount} success, ${errorCount} errors`);
    } catch (error) {
      logger.error('Automated EWURA submission failed:', error);
    }
  }

  /**
   * Detect anomalies across all stations
   */
  async detectAnomalies() {
    try {
      logger.info('Starting automated anomaly detection...');

      // Get all active stations
      const stationsResult = await DatabaseManager.query(`
        SELECT id, name, code FROM stations WHERE is_active = true
      `);

      let anomaliesDetected = 0;

      for (const station of stationsResult.rows) {
        try {
          // Detect daily anomalies
          const anomalies = await refillDetectionService.detectDailyAnomalies(station.id);
          
          if (anomalies.length > 0) {
            logger.warn(`Detected ${anomalies.length} anomalies for station ${station.name}`);
            anomaliesDetected += anomalies.length;

            // Store anomaly alerts
            for (const anomaly of anomalies) {
              await DatabaseManager.query(`
                INSERT INTO anomaly_alerts (
                  station_id, tank_id, anomaly_type, volume_difference,
                  detected_at, description
                )
                VALUES ($1, $2, $3, $4, NOW(), $5)
                ON CONFLICT (station_id, tank_id, detected_at) DO NOTHING
              `, [
                station.id,
                anomaly.tank_id,
                anomaly.anomaly_type,
                anomaly.volume_difference,
                `Potential ${anomaly.anomaly_type.toLowerCase()} detected: ${anomaly.volume_difference}L difference`
              ]);
            }
          }

          // Detect refill events
          const refills = await refillDetectionService.detectRefillEvents(station.id);
          if (refills.length > 0) {
            logger.info(`Detected ${refills.length} refill events for station ${station.name}`);
          }

        } catch (error) {
          logger.error(`Anomaly detection failed for station ${station.name}:`, error);
        }
      }

      logger.info(`Anomaly detection completed: ${anomaliesDetected} anomalies detected`);
    } catch (error) {
      logger.error('Automated anomaly detection failed:', error);
    }
  }

  /**
   * Cleanup old backup files
   */
  async cleanupOldBackups() {
    try {
      logger.info('Starting backup cleanup...');

      // Get retention settings
      const retentionResult = await DatabaseManager.query(`
        SELECT value FROM system_settings 
        WHERE category = 'backup' AND key = 'retention_days'
      `);

      const retentionDays = retentionResult.rows.length > 0 ? 
        JSON.parse(retentionResult.rows[0].value) : 30;

      // Delete old backup records
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await DatabaseManager.query(`
        DELETE FROM backup_history 
        WHERE created_at < $1
        RETURNING id
      `, [cutoffDate]);

      logger.info(`Cleaned up ${result.rows.length} old backup records`);
    } catch (error) {
      logger.error('Backup cleanup failed:', error);
    }
  }

  /**
   * Update scheduler settings and reschedule jobs
   */
  async updateSettings(newSettings) {
    try {
      this.settings = { ...this.settings, ...newSettings };
      await this.scheduleJobs(); // Reschedule with new settings
      logger.info('Scheduler settings updated and jobs rescheduled');
    } catch (error) {
      logger.error('Failed to update scheduler settings:', error);
      throw error;
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stopAllJobs() {
    for (const [name, job] of this.jobs) {
      try {
        job.stop();
        logger.info(`Stopped scheduled job: ${name}`);
      } catch (error) {
        logger.error(`Failed to stop job ${name}:`, error);
      }
    }
    this.jobs.clear();
  }

  /**
   * Get job status
   */
  getJobStatus() {
    const status = {};
    for (const [name, job] of this.jobs) {
      status[name] = {
        running: job.running || false,
        scheduled: true
      };
    }
    return status;
  }

  /**
   * Manual trigger for daily report generation
   */
  async triggerDailyReports(stationId = null, date = null) {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      if (stationId) {
        // Generate for specific station
        const reportData = await ReportController.generateReportData(stationId, targetDate, 'NPGIS');
        const reportId = await ReportController.storeReport(stationId, targetDate, reportData);
        return { reportId, stationId, date: targetDate };
      } else {
        // Generate for all stations
        await this.generateDailyReports();
        return { message: 'Daily reports generated for all stations' };
      }
    } catch (error) {
      logger.error('Manual daily report generation failed:', error);
      throw error;
    }
  }

  /**
   * Manual trigger for EWURA submissions
   */
  async triggerEwuraSubmissions(stationId = null) {
    try {
      if (stationId) {
        // Send for specific station
        const pendingReports = await DatabaseManager.query(`
          SELECT * FROM daily_reports 
          WHERE station_id = $1 AND ewura_sent = false AND status = 'PROCESSED'
          ORDER BY report_date ASC
        `, [stationId]);

        let successCount = 0;
        for (const report of pendingReports.rows) {
          try {
            await this.submitReportToEwura(report);
            successCount++;
          } catch (error) {
            logger.error(`EWURA submission failed for report ${report.id}:`, error);
          }
        }

        return { submitted: successCount, stationId };
      } else {
        // Send all pending
        await this.sendPendingEwuraReports();
        return { message: 'All pending EWURA submissions processed' };
      }
    } catch (error) {
      logger.error('Manual EWURA submission failed:', error);
      throw error;
    }
  }

  async submitReportToEwura(report) {
    // Implementation for individual report submission
    // This would use the EWURAService to format and send the report
    const summaryData = {
      tranId: `RPT-${report.report_no}`,
      reportId: report.id,
      reportNo: report.report_no,
      // ... other required fields
    };

    const result = await EWURAService.generateAndSubmitDailySummary(
      report.station_id,
      report.report_date,
      summaryData
    );

    // Update report status
    await DatabaseManager.query(`
      UPDATE daily_reports 
      SET ewura_sent = true, ewura_sent_at = NOW(), ewura_response = $1
      WHERE id = $2
    `, [JSON.stringify(result), report.id]);

    return result;
  }

  /**
   * Stop the scheduler service
   */
  async stop() {
    logger.info('Stopping Scheduler Service...');
    this.stopAllJobs();
    this.isInitialized = false;
    logger.info('✅ Scheduler Service stopped');
  }
}

export const schedulerService = new SchedulerService();