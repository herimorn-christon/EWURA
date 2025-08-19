import { DatabaseManager } from '../database/DatabaseManager.js';
import { ApiResponse } from '../views/ApiResponse.js';
import { logger } from '../utils/logger.js';
import { EWURAService } from '../services/EWURAService.js';
// import { refillDetectionService } from "./servi";
import { ReportService } from '../services/ReportService.js';

export class ReportController {
  static async getDailyReport(req, res, next) {
    try {
      const { date, stationId } = req.query;
      const user = req.user;

      // Check station access permissions
      const accessCheck = ReportController.checkStationAccess(user, stationId);
      if (!accessCheck.canAccess) {
        return ApiResponse.forbidden(res, accessCheck.error);
      }

      const effectiveStationId = accessCheck.stationId;
      const reportData = await ReportController.generateReportData(
        effectiveStationId, 
        date || new Date().toISOString().split('T')[0],
        'DAILY'
      );

      ApiResponse.success(res, { report: reportData });
    } catch (error) {
      logger.error('Get daily report error:', error);
      next(error);
    }
  }
static async getReports(req, res, next) {
    try {
      const { stationId, fromDate, toDate, status, interfaceType, limit = 50 } = req.query;
      const user = req.user;

      // Check station access permissions
      const accessCheck = ReportController.checkStationAccess(user, stationId);
      if (!accessCheck.canAccess) {
        return ApiResponse.forbidden(res, accessCheck.error);
      }

      const effectiveStationId = accessCheck.stationId;

      let query = `
        SELECT 
          dr.*,
          s.name as station_name,
          s.code as station_code,
          it.code as interface_code,
          it.name as interface_name
        FROM daily_reports dr
        JOIN stations s ON dr.station_id = s.id
        JOIN interface_types it ON s.interface_type_id = it.id
        WHERE 1=1
      `;

      const params = [];

      if (effectiveStationId) {
        params.push(effectiveStationId);
        query += ` AND dr.station_id = $${params.length}`;
      }

      if (fromDate) {
        params.push(fromDate);
        query += ` AND dr.report_date >= $${params.length}`;
      }

      if (toDate) {
        params.push(toDate);
        query += ` AND dr.report_date <= $${params.length}`;
      }

      if (status) {
        params.push(status);
        query += ` AND dr.status = $${params.length}`;
      }

      if (interfaceType) {
        params.push(interfaceType);
        query += ` AND it.code = $${params.length}`;
      }

      params.push(limit);
      query += ` ORDER BY dr.report_date DESC, dr.generated_at DESC LIMIT $${params.length}`;

      const result = await DatabaseManager.query(query, params);

      ApiResponse.success(res, {
        reports: result.rows,
        filters: { stationId: effectiveStationId, fromDate, toDate, status, interfaceType },
        count: result.rows.length
      });
    } catch (error) {
      logger.error('Get reports error:', error);
      next(error);
    }
  }
  static async generateDailyReport(req, res, next) {
    try {
      const { stationId, date } = req.body;
      const user = req.user;

      // Check station access permissions
      const accessCheck = ReportController.checkStationAccess(user, stationId);
      if (!accessCheck.canAccess) {
        return ApiResponse.forbidden(res, accessCheck.error);
      }

      const effectiveStationId = accessCheck.stationId;
      const reportDate = date || new Date().toISOString().split('T')[0];

      // Get station info
      const stationResult = await DatabaseManager.query(`
        SELECT s.*, it.code as interface_code, it.name as interface_name
        FROM stations s
        JOIN interface_types it ON s.interface_type_id = it.id
        WHERE s.id = $1
      `, [effectiveStationId]);

      if (stationResult.rows.length === 0) {
        return ApiResponse.notFound(res, 'Station not found');
      }

      const station = stationResult.rows[0];

      // Generate report data
      const reportData = await ReportController.generateReportData(effectiveStationId, reportDate, station.interface_code);

      // Store report in database
      const reportId = await ReportController.storeReport(effectiveStationId, reportDate, reportData);

      logger.info(`Daily report generated: ${station.name} - ${reportDate}`);

      ApiResponse.success(res, {
        reportId,
        reportData,
        station: {
          id: station.id,
          name: station.name,
          code: station.code,
          interface: station.interface_code
        },
        message: 'Daily report generated successfully'
      });
    } catch (error) {
      logger.error('Generate daily report error:', error);
      next(error);
    }
  }
  static async getMonthlyReport(req, res, next) {
    try {
      const { year, month, stationId } = req.query;
      const user = req.user;

      // Check station access permissions
      const accessCheck = ReportController.checkStationAccess(user, stationId);
      if (!accessCheck.canAccess) {
        return ApiResponse.forbidden(res, accessCheck.error);
      }

      const effectiveStationId = accessCheck.stationId;

      // Generate monthly report data
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const reportData = await ReportController.generateReportData(
        effectiveStationId,
        startDate.toISOString().split('T')[0],
        'MONTHLY',
        endDate.toISOString().split('T')[0]
      );

      ApiResponse.success(res, { report: reportData });
    } catch (error) {
      logger.error('Get monthly report error:', error);
      next(error);
    }
  }

   static async generateReportData(stationId, reportDate, interfaceCode) {
      try {
        // Get transaction summary
        const transactionSummary = await DatabaseManager.query(`
          SELECT 
            COUNT(*) as transaction_count,
            SUM(volume) as total_volume,
            SUM(total_amount) as total_amount,
            SUM(discount_amount) as total_discount,
            COUNT(DISTINCT fuel_grade_name) as fuel_types,
            interface_source
          FROM sales_transactions
          WHERE station_id = $1 AND transaction_date = $2
          GROUP BY interface_source
        `, [stationId, reportDate]);
  
        // Get tank readings summary
        const tankSummary = await DatabaseManager.query(`
          SELECT 
            t.tank_number,
            t.capacity,
            p.name as product_name,
            -- Start of day reading
            (SELECT tr1.total_volume 
             FROM tank_readings tr1 
             WHERE tr1.tank_id = t.id 
               AND DATE(tr1.reading_timestamp) = $2
             ORDER BY tr1.reading_timestamp ASC 
             LIMIT 1) as start_volume,
            -- End of day reading
            (SELECT tr2.total_volume 
             FROM tank_readings tr2 
             WHERE tr2.tank_id = t.id 
               AND DATE(tr2.reading_timestamp) = $2
             ORDER BY tr2.reading_timestamp DESC 
             LIMIT 1) as end_volume,
            -- Average temperature
            (SELECT AVG(tr3.temperature) 
             FROM tank_readings tr3 
             WHERE tr3.tank_id = t.id 
               AND DATE(tr3.reading_timestamp) = $2) as avg_temperature
          FROM tanks t
          LEFT JOIN products p ON t.product_id = p.id
          WHERE t.station_id = $1 AND t.is_active = true
          ORDER BY t.tank_number
        `, [stationId, reportDate]);
  
        // Get refill events
        const refillEvents = await refillDetectionService.getRefillEvents({
          stationId,
          startDate: reportDate,
          endDate: reportDate
        });
  
        // Detect anomalies
        const anomalies = await refillDetectionService.detectDailyAnomalies(stationId, reportDate);
  
        // Calculate totals
        const totals = transactionSummary.rows.reduce((acc, row) => ({
          transactions: acc.transactions + parseInt(row.transaction_count),
          volume: acc.volume + parseFloat(row.total_volume || 0),
          amount: acc.amount + parseFloat(row.total_amount || 0),
          discount: acc.discount + parseFloat(row.total_discount || 0)
        }), { transactions: 0, volume: 0, amount: 0, discount: 0 });
  
        return {
          reportDate,
          reportNo: reportDate.replace(/-/g, ''),
          stationId,
          interfaceCode,
          summary: {
            numberOfTransactions: totals.transactions,
            totalVolume: totals.volume,
            totalAmount: totals.amount,
            totalDiscount: totals.discount
          },
          tankReadings: tankSummary.rows,
          refillEvents,
          anomalies,
          transactionsByInterface: transactionSummary.rows,
          generatedAt: new Date().toISOString()
        };
      } catch (error) {
        logger.error('Error generating report data:', error);
        throw error;
      }
    }

      static async getReportSettings(req, res, next) {
        try {
          const result = await DatabaseManager.query(`
            SELECT * FROM system_settings 
            WHERE category = 'report_generation'
            ORDER BY key
          `);
    
          const settings = result.rows.reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
          }, {});
    
          ApiResponse.success(res, { settings });
        } catch (error) {
          logger.error('Get report settings error:', error);
          next(error);
        }
      }
    
      /**
       * Update report generation settings
       */
      static async updateReportSettings(req, res, next) {
        try {
          const { generationTime, ewuraSendTime, timezone, autoGenerate, autoSendToEwura } = req.body;
          const user = req.user;
    
          // Only admin can update settings
          if (user.role !== 'admin' && user.user_role?.code !== 'ADMIN') {
            return ApiResponse.forbidden(res, 'Only administrators can update settings');
          }
    
          const settingsToUpdate = {
            generation_time: generationTime,
            ewura_send_time: ewuraSendTime,
            timezone: timezone,
            auto_generate: autoGenerate,
            auto_send_to_ewura: autoSendToEwura
          };
    
          // Update each setting
          for (const [key, value] of Object.entries(settingsToUpdate)) {
            await DatabaseManager.query(`
              INSERT INTO system_settings (category, key, value, updated_by)
              VALUES ('report_generation', $1, $2, $3)
              ON CONFLICT (category, key)
              DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()
            `, [key, JSON.stringify(value), user.id]);
          }
    
          logger.info(`Report settings updated by user: ${user.username}`);
    
          ApiResponse.success(res, {
            settings: settingsToUpdate,
            message: 'Report generation settings updated successfully'
          });
        } catch (error) {
          logger.error('Update report settings error:', error);
          next(error);
        }
      }
    
      /**
       * Get dashboard statistics
       */
      static async getDashboardStats(req, res, next) {
        try {
          const { stationId, period = '7d' } = req.query;
          const user = req.user;
    
          // Check station access permissions
          const accessCheck = ReportController.checkStationAccess(user, stationId);
          if (!accessCheck.canAccess) {
            return ApiResponse.forbidden(res, accessCheck.error);
          }
    
          const effectiveStationId = accessCheck.stationId;
    
          // Calculate date range based on period
          const endDate = new Date();
          const startDate = new Date();
          
          switch (period) {
            case '1d':
              startDate.setDate(endDate.getDate() - 1);
              break;
            case '7d':
              startDate.setDate(endDate.getDate() - 7);
              break;
            case '30d':
              startDate.setDate(endDate.getDate() - 30);
              break;
            default:
              startDate.setDate(endDate.getDate() - 7);
          }
    
          // Get transaction statistics
          let transactionQuery = `
            SELECT 
              COUNT(*) as total_transactions,
              SUM(volume) as total_volume,
              SUM(total_amount) as total_sales,
              AVG(total_amount) as avg_transaction_value,
              interface_source
            FROM sales_transactions
            WHERE transaction_date BETWEEN $1 AND $2
          `;
    
          const params = [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]];
    
          if (effectiveStationId) {
            params.push(effectiveStationId);
            transactionQuery += ` AND station_id = $${params.length}`;
          }
    
          transactionQuery += ` GROUP BY interface_source`;
    
          const transactionStats = await DatabaseManager.query(transactionQuery, params);
    
          // Get tank statistics
          let tankQuery = `
            SELECT 
              t.tank_number,
              t.capacity,
              t.current_level,
              p.name as product_name,
              s.name as station_name
            FROM tanks t
            LEFT JOIN products p ON t.product_id = p.id
            LEFT JOIN stations s ON t.station_id = s.id
            WHERE t.is_active = true
          `;
    
          if (effectiveStationId) {
            tankQuery += ` AND t.station_id = $${params.length + 1}`;
            params.push(effectiveStationId);
          }
    
          const tankStats = await DatabaseManager.query(tankQuery, params);
    
          // Get recent anomalies
          const anomalies = await refillDetectionService.detectDailyAnomalies(effectiveStationId);
    
          ApiResponse.success(res, {
            period,
            dateRange: { startDate, endDate },
            transactions: transactionStats.rows,
            tanks: tankStats.rows,
            anomalies,
            summary: {
              totalTransactions: transactionStats.rows.reduce((sum, row) => sum + parseInt(row.total_transactions), 0),
              totalVolume: transactionStats.rows.reduce((sum, row) => sum + parseFloat(row.total_volume || 0), 0),
              totalSales: transactionStats.rows.reduce((sum, row) => sum + parseFloat(row.total_sales || 0), 0),
              activeTanks: tankStats.rows.length,
              anomalyCount: anomalies.length
            }
          });
        } catch (error) {
          logger.error('Get dashboard stats error:', error);
          next(error);
        }
      }
    
      /**
       * Get tank monitoring report
       */
      static async getTankMonitoringReport(req, res, next) {
        try {
          const { stationId, startDate, endDate, tankId } = req.query;
          const user = req.user;
    
          // Check station access permissions
          const accessCheck = ReportController.checkStationAccess(user, stationId);
          if (!accessCheck.canAccess) {
            return ApiResponse.forbidden(res, accessCheck.error);
          }
    
          const effectiveStationId = accessCheck.stationId;
    
          let query = `
            SELECT 
              tr.*,
              t.tank_number,
              t.capacity,
              p.name as product_name,
              s.name as station_name
            FROM tank_readings tr
            JOIN tanks t ON tr.tank_id = t.id
            LEFT JOIN products p ON t.product_id = p.id
            LEFT JOIN stations s ON t.station_id = s.id
            WHERE 1=1
          `;
    
          const params = [];
    
          if (effectiveStationId) {
            params.push(effectiveStationId);
            query += ` AND t.station_id = $${params.length}`;
          }
    
          if (tankId) {
            params.push(tankId);
            query += ` AND tr.tank_id = $${params.length}`;
          }
    
          if (startDate) {
            params.push(startDate);
            query += ` AND DATE(tr.reading_timestamp) >= $${params.length}`;
          }
    
          if (endDate) {
            params.push(endDate);
            query += ` AND DATE(tr.reading_timestamp) <= $${params.length}`;
          }
    
          query += ` ORDER BY tr.reading_timestamp DESC LIMIT 1000`;
    
          const result = await DatabaseManager.query(query, params);
    
          ApiResponse.success(res, {
            readings: result.rows,
            filters: { stationId: effectiveStationId, startDate, endDate, tankId },
            count: result.rows.length
          });
        } catch (error) {
          logger.error('Get tank monitoring report error:', error);
          next(error);
        }
      }

  /**
   * Get tank performance report
   */
  static async getTankPerformanceReport(req, res, next) {
    try {
      const { startDate, endDate, tankId } = req.query;
      const report = await ReportService.generateTankPerformanceReport(startDate, endDate, tankId);
      
      ApiResponse.success(res, { report });
    } catch (error) {
      logger.error('Get tank performance report error:', error);
      next(error);
    }
  }

  /**
   * Get sales summary report
   */
  static async getSalesSummaryReport(req, res, next) {
    try {
      const { startDate, endDate, stationId } = req.query;
      const report = await ReportService.generateSalesSummaryReport(startDate, endDate, stationId);
      
      ApiResponse.success(res, { report });
    } catch (error) {
      logger.error('Get sales summary report error:', error);
      next(error);
    }
  }

  /**
   * Get inventory report
   */
  static async getInventoryReport(req, res, next) {
    try {
      const { stationId } = req.query;
      const report = await ReportService.generateInventoryReport(stationId);
      
      ApiResponse.success(res, { report });
    } catch (error) {
      logger.error('Get inventory report error:', error);
      next(error);
    }
  }

  static checkStationAccess(user, requestedStationId) {
    // Admin can access all stations
    if (user.role === 'admin' || user.user_role?.code === 'ADMIN') {
      return { canAccess: true, stationId: requestedStationId };
    }

    // Non-admin users can only access their assigned station
    if (user.station_id) {
      if (!requestedStationId || requestedStationId === user.station_id) {
        return { canAccess: true, stationId: user.station_id };
      } else {
        return { canAccess: false, error: 'Access denied to requested station' };
      }
    }

    return { canAccess: false, error: 'No station assigned to user' };
  }

  /**
   * Export report in specified format
   */
  static async exportReport(req, res, next) {
    try {
      const { id } = req.params;
      const { format = 'pdf' } = req.query;
      const user = req.user;

      // Get report
      const reportResult = await DatabaseManager.query(`
        SELECT dr.*, s.name as station_name, s.code as station_code
        FROM daily_reports dr
        JOIN stations s ON dr.station_id = s.id
        WHERE dr.id = $1
      `, [id]);

      if (reportResult.rows.length === 0) {
        return ApiResponse.notFound(res, 'Report not found');
      }

      const report = reportResult.rows[0];

      // Check station access permissions
      const accessCheck = ReportController.checkStationAccess(user, report.station_id);
      if (!accessCheck.canAccess) {
        return ApiResponse.forbidden(res, accessCheck.error);
      }

      // Generate export based on format
      let exportData;
      switch (format.toLowerCase()) {
        case 'pdf':
          exportData = await ReportController.generatePDFReport(report);
          break;
        case 'excel':
          exportData = await ReportController.generateExcelReport(report);
          break;
        case 'json':
          exportData = report.raw_data;
          break;
        default:
          return ApiResponse.badRequest(res, 'Unsupported export format');
      }

      ApiResponse.success(res, {
        reportId: id,
        format,
        data: exportData,
        filename: `report_${report.station_code}_${report.report_date}.${format}`,
        message: `Report exported as ${format.toUpperCase()}`
      });
    } catch (error) {
      logger.error('Export report error:', error);
      next(error);
    }
  }

  /**
   * Generate PDF report
   */
  static async generatePDFReport(report) {
    // TODO: Implement PDF generation
    return {
      type: 'pdf',
      content: 'PDF generation not yet implemented',
      report: report
    };
  }

  /**
   * Generate Excel report
   */
  static async generateExcelReport(report) {
    // TODO: Implement Excel generation
    return {
      type: 'excel',
      content: 'Excel generation not yet implemented',
      report: report
    };
  }

  /**
   * Store report in database
   */
  static async storeReport(stationId, reportDate, reportData) {
    try {
      const result = await DatabaseManager.query(`
        INSERT INTO daily_reports (
          station_id, report_date, report_no, number_of_transactions,
          total_volume, total_amount, total_discount, interface_source,
          tank_readings, refill_events, anomalies, raw_data, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'PROCESSED')
        ON CONFLICT (station_id, report_date)
        DO UPDATE SET
          number_of_transactions = EXCLUDED.number_of_transactions,
          total_volume = EXCLUDED.total_volume,
          total_amount = EXCLUDED.total_amount,
          total_discount = EXCLUDED.total_discount,
          tank_readings = EXCLUDED.tank_readings,
          refill_events = EXCLUDED.refill_events,
          anomalies = EXCLUDED.anomalies,
          raw_data = EXCLUDED.raw_data,
          updated_at = NOW()
        RETURNING id
      `, [
        stationId,
        reportDate,
        reportData.reportNo,
        reportData.summary.numberOfTransactions,
        reportData.summary.totalVolume,
        reportData.summary.totalAmount,
        reportData.summary.totalDiscount,
        reportData.interfaceCode,
        JSON.stringify(reportData.tankReadings),
        JSON.stringify(reportData.refillEvents),
        JSON.stringify(reportData.anomalies),
        JSON.stringify(reportData)
      ]);

      return result.rows[0].id;
    } catch (error) {
      logger.error('Error storing report:', error);
      throw error;
    }
  }
}