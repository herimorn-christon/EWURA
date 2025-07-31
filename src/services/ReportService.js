import { dbManager } from '../database/DatabaseManager.js';
import { logger } from '../utils/logger.js';

export class ReportService {
  static async generateDailyReport(date, stationId) {
    try {
      const reportDate = date || new Date().toISOString().split('T')[0];
      
      let query = `
        SELECT 
          s.id as station_id,
          s.name as station_name,
          COUNT(DISTINCT st.id) as total_transactions,
          SUM(st.volume) as total_volume,
          SUM(st.total_amount) as total_revenue,
          AVG(st.unit_price) as avg_price,
          COUNT(DISTINCT st.product_id) as products_sold
        FROM stations s
        LEFT JOIN sales_transactions st ON s.id = st.station_id
          AND st.transaction_date = $1
      `;
      
      const params = [reportDate];
      
      if (stationId) {
        query += ` WHERE s.id = $2`;
        params.push(stationId);
      }
      
      query += ` GROUP BY s.id, s.name ORDER BY s.name`;
      
      const result = await dbManager.query(query, params);
      
      return {
        date: reportDate,
        stations: result.rows,
        summary: {
          total_stations: result.rows.length,
          total_transactions: result.rows.reduce((sum, row) => sum + parseInt(row.total_transactions || 0), 0),
          total_volume: result.rows.reduce((sum, row) => sum + parseFloat(row.total_volume || 0), 0),
          total_revenue: result.rows.reduce((sum, row) => sum + parseFloat(row.total_revenue || 0), 0)
        }
      };
    } catch (error) {
      logger.error('Generate daily report error:', error);
      throw error;
    }
  }

  static async generateMonthlyReport(year, month, stationId) {
    try {
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      
      let query = `
        SELECT 
          s.id as station_id,
          s.name as station_name,
          DATE(st.transaction_date) as date,
          COUNT(st.id) as daily_transactions,
          SUM(st.volume) as daily_volume,
          SUM(st.total_amount) as daily_revenue
        FROM stations s
        LEFT JOIN sales_transactions st ON s.id = st.station_id
          AND st.transaction_date BETWEEN $1 AND $2
      `;
      
      const params = [startDate, endDate];
      
      if (stationId) {
        query += ` WHERE s.id = $3`;
        params.push(stationId);
      }
      
      query += ` GROUP BY s.id, s.name, DATE(st.transaction_date) ORDER BY s.name, date`;
      
      const result = await dbManager.query(query, params);
      
      return {
        period: `${year}-${month}`,
        startDate,
        endDate,
        data: result.rows
      };
    } catch (error) {
      logger.error('Generate monthly report error:', error);
      throw error;
    }
  }

  static async generateTankPerformanceReport(startDate, endDate, tankId) {
    try {
      let query = `
        SELECT 
          t.id,
          t.tank_number,
          t.capacity,
          p.name as product_name,
          s.name as station_name,
          AVG(tr.total_volume) as avg_volume,
          MIN(tr.total_volume) as min_volume,
          MAX(tr.total_volume) as max_volume,
          AVG(tr.temperature) as avg_temperature,
          COUNT(tr.id) as readings_count
        FROM tanks t
        LEFT JOIN products p ON t.product_id = p.id
        LEFT JOIN stations s ON t.station_id = s.id
        LEFT JOIN tank_readings tr ON t.id = tr.tank_id
          AND tr.reading_timestamp BETWEEN $1 AND $2
      `;
      
      const params = [startDate, endDate];
      
      if (tankId) {
        query += ` WHERE t.id = $3`;
        params.push(tankId);
      }
      
      query += ` GROUP BY t.id, t.tank_number, t.capacity, p.name, s.name ORDER BY s.name, t.tank_number`;
      
      const result = await dbManager.query(query, params);
      
      return {
        period: { startDate, endDate },
        tanks: result.rows
      };
    } catch (error) {
      logger.error('Generate tank performance report error:', error);
      throw error;
    }
  }

  static async generateSalesSummaryReport(startDate, endDate, stationId) {
    try {
      let query = `
        SELECT 
          s.name as station_name,
          p.name as product_name,
          COUNT(st.id) as transaction_count,
          SUM(st.volume) as total_volume,
          SUM(st.total_amount) as total_revenue,
          AVG(st.unit_price) as avg_price
        FROM sales_transactions st
        JOIN stations s ON st.station_id = s.id
        JOIN products p ON st.product_id = p.id
        WHERE st.transaction_date BETWEEN $1 AND $2
      `;
      
      const params = [startDate, endDate];
      
      if (stationId) {
        query += ` AND s.id = $3`;
        params.push(stationId);
      }
      
      query += ` GROUP BY s.name, p.name ORDER BY s.name, p.name`;
      
      const result = await dbManager.query(query, params);
      
      return {
        period: { startDate, endDate },
        sales: result.rows
      };
    } catch (error) {
      logger.error('Generate sales summary report error:', error);
      throw error;
    }
  }

  static async generateInventoryReport(stationId) {
    try {
      let query = `
        SELECT 
          t.id,
          t.tank_number,
          t.capacity,
          t.current_level,
          t.safe_level,
          t.critical_level,
          p.name as product_name,
          s.name as station_name,
          tr.reading_timestamp as last_reading,
          tr.temperature,
          tr.water_volume,
          (t.capacity - t.current_level) as available_capacity,
          CASE 
            WHEN t.current_level <= t.critical_level THEN 'CRITICAL'
            WHEN t.current_level <= t.safe_level THEN 'LOW'
            ELSE 'NORMAL'
          END as status
        FROM tanks t
        LEFT JOIN products p ON t.product_id = p.id
        LEFT JOIN stations s ON t.station_id = s.id
        LEFT JOIN LATERAL (
          SELECT reading_timestamp, temperature, water_volume
          FROM tank_readings tr
          WHERE tr.tank_id = t.id
          ORDER BY reading_timestamp DESC
          LIMIT 1
        ) tr ON true
      `;
      
      const params = [];
      
      if (stationId) {
        query += ` WHERE s.id = $1`;
        params.push(stationId);
      }
      
      query += ` ORDER BY s.name, t.tank_number`;
      
      const result = await dbManager.query(query, params);
      
      return {
        timestamp: new Date().toISOString(),
        tanks: result.rows
      };
    } catch (error) {
      logger.error('Generate inventory report error:', error);
      throw error;
    }
  }
}