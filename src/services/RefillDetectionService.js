import { DatabaseManager } from '../database/DatabaseManager.js';
import { logger } from '../utils/logger.js';

/**
 * Refill Detection Service
 * Detects refill events and anomalies in tank readings
 */
export class RefillDetectionService {
  constructor() {
    this.refillThreshold = 500; // Minimum volume increase to consider as refill (liters)
    this.anomalyThreshold = 100; // Minimum volume decrease to flag as anomaly (liters)
  }

  /**
   * Detect refill events from tank readings
   */
  async detectRefillEvents(tankId, timeWindow = '24 HOURS') {
    try {
      const query = `
        WITH reading_changes AS (
          SELECT 
            tr.*,
            LAG(tr.total_volume) OVER (ORDER BY tr.reading_timestamp) as prev_volume,
            tr.total_volume - LAG(tr.total_volume) OVER (ORDER BY tr.reading_timestamp) as volume_change
          FROM tank_readings tr
          WHERE tr.tank_id = $1 
            AND tr.reading_timestamp >= NOW() - INTERVAL '${timeWindow}'
          ORDER BY tr.reading_timestamp
        )
        SELECT *
        FROM reading_changes
        WHERE volume_change > $2
        ORDER BY reading_timestamp DESC
      `;

      const result = await DatabaseManager.query(query, [tankId, this.refillThreshold]);
      
      // Store detected refill events
      for (const reading of result.rows) {
        await this.storeRefillEvent(tankId, reading);
      }

      return result.rows;
    } catch (error) {
      logger.error('Error detecting refill events:', error);
      throw error;
    }
  }

  /**
   * Store refill event in database
   */
  async storeRefillEvent(tankId, reading) {
    try {
      const refillData = {
        tank_id: tankId,
        detected_at: reading.reading_timestamp,
        volume_added: reading.volume_change,
        volume_before: reading.prev_volume,
        volume_after: reading.total_volume,
        temperature_before: null, // TODO: Get from previous reading
        temperature_after: reading.temperature
      };

      await DatabaseManager.query(`
        INSERT INTO refill_events (
          tank_id, detected_at, volume_added, volume_before, volume_after,
          temperature_before, temperature_after
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (tank_id, detected_at) DO NOTHING
      `, [
        refillData.tank_id,
        refillData.detected_at,
        refillData.volume_added,
        refillData.volume_before,
        refillData.volume_after,
        refillData.temperature_before,
        refillData.temperature_after
      ]);

      logger.info(`Refill event stored: Tank ${tankId}, +${reading.volume_change}L at ${reading.reading_timestamp}`);
    } catch (error) {
      logger.error('Error storing refill event:', error);
      throw error;
    }
  }

  /**
   * Detect daily anomalies (potential losses)
   */
  async detectDailyAnomalies(stationId = null, date = null) {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const previousDate = new Date(targetDate);
      previousDate.setDate(previousDate.getDate() - 1);
      const prevDateStr = previousDate.toISOString().split('T')[0];

      let query = `
        WITH daily_readings AS (
          SELECT 
            t.id as tank_id,
            t.tank_number,
            s.name as station_name,
            -- End of previous day reading
            (SELECT tr1.total_volume 
             FROM tank_readings tr1 
             WHERE tr1.tank_id = t.id 
               AND DATE(tr1.reading_timestamp) = $1
             ORDER BY tr1.reading_timestamp DESC 
             LIMIT 1) as prev_day_end_volume,
            -- Start of current day reading
            (SELECT tr2.total_volume 
             FROM tank_readings tr2 
             WHERE tr2.tank_id = t.id 
               AND DATE(tr2.reading_timestamp) = $2
             ORDER BY tr2.reading_timestamp ASC 
             LIMIT 1) as curr_day_start_volume
          FROM tanks t
          JOIN stations s ON t.station_id = s.id
          WHERE t.is_active = true
      `;

      const params = [prevDateStr, targetDate];
      
      if (stationId) {
        query += ` AND t.station_id = $3`;
        params.push(stationId);
      }

      query += `
        )
        SELECT *,
          (prev_day_end_volume - curr_day_start_volume) as volume_difference,
          CASE 
            WHEN prev_day_end_volume IS NULL OR curr_day_start_volume IS NULL THEN 'MISSING_DATA'
            WHEN (prev_day_end_volume - curr_day_start_volume) > $${params.length + 1} THEN 'POTENTIAL_LOSS'
            ELSE 'NORMAL'
          END as anomaly_type
        FROM daily_readings
        WHERE prev_day_end_volume IS NOT NULL 
          AND curr_day_start_volume IS NOT NULL
          AND (prev_day_end_volume - curr_day_start_volume) > $${params.length + 1}
      `;

      params.push(this.anomalyThreshold);

      const result = await DatabaseManager.query(query, params);
      
      logger.info(`Detected ${result.rows.length} potential anomalies for ${targetDate}`);
      return result.rows;
    } catch (error) {
      logger.error('Error detecting daily anomalies:', error);
      throw error;
    }
  }

  /**
   * Get refill events for a tank or station
   */
  async getRefillEvents(filters = {}) {
    try {
      const { tankId, stationId, startDate, endDate, limit = 50 } = filters;
      
      let query = `
        SELECT 
          re.*,
          t.tank_number,
          s.name as station_name,
          p.name as product_name
        FROM refill_events re
        JOIN tanks t ON re.tank_id = t.id
        JOIN stations s ON t.station_id = s.id
        LEFT JOIN products p ON t.product_id = p.id
        WHERE 1=1
      `;
      
      const params = [];
      
      if (tankId) {
        params.push(tankId);
        query += ` AND re.tank_id = $${params.length}`;
      }
      
      if (stationId) {
        params.push(stationId);
        query += ` AND t.station_id = $${params.length}`;
      }
      
      if (startDate) {
        params.push(startDate);
        query += ` AND DATE(re.detected_at) >= $${params.length}`;
      }
      
      if (endDate) {
        params.push(endDate);
        query += ` AND DATE(re.detected_at) <= $${params.length}`;
      }
      
      params.push(limit);
      query += ` ORDER BY re.detected_at DESC LIMIT $${params.length}`;

      const result = await DatabaseManager.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting refill events:', error);
      throw error;
    }
  }
}

export const refillDetectionService = new RefillDetectionService();