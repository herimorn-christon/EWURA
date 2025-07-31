import { dbManager } from '../database/DatabaseManager.js';
import { logger } from '../utils/logger.js';

export class AnalyticsService {
  static async getDashboardData(stationId) {
    try {
      // Get station summary
      let stationQuery = `
        SELECT COUNT(*) as total_stations,
               COUNT(CASE WHEN is_active = true THEN 1 END) as active_stations
        FROM stations
      `;
      
      if (stationId) {
        stationQuery += ` WHERE id = $1`;
      }
      
      const stationResult = await DatabaseManager.query(stationQuery, stationId ? [stationId] : []);
      
      // Get tank summary
      let tankQuery = `
        SELECT COUNT(*) as total_tanks,
               COUNT(CASE WHEN current_level > safe_level THEN 1 END) as normal_tanks,
               COUNT(CASE WHEN current_level <= safe_level AND current_level > critical_level THEN 1 END) as low_tanks,
               COUNT(CASE WHEN current_level <= critical_level THEN 1 END) as critical_tanks
        FROM tanks t
      `;
      
      if (stationId) {
        tankQuery += ` WHERE t.station_id = $1`;
      }
      
      const tankResult = await dbManager.query(tankQuery, stationId ? [stationId] : []);
      
      // Get today's sales
      let salesQuery = `
        SELECT COUNT(*) as transactions_today,
               COALESCE(SUM(total_amount), 0) as revenue_today,
               COALESCE(SUM(volume), 0) as volume_today
        FROM sales_transactions
        WHERE transaction_date = CURRENT_DATE
      `;
      
      if (stationId) {
        salesQuery += ` AND station_id = $1`;
      }
      
      const salesResult = await dbManager.query(salesQuery, stationId ? [stationId] : []);
      
      // Get recent activity
      let activityQuery = `
        SELECT 'sale' as type, transaction_date as date, total_amount as value
        FROM sales_transactions
        WHERE transaction_date >= CURRENT_DATE - INTERVAL '7 days'
      `;
      
      if (stationId) {
        activityQuery += ` AND station_id = $1`;
      }
      
      activityQuery += ` ORDER BY transaction_date DESC LIMIT 10`;
      
      const activityResult = await dbManager.query(activityQuery, stationId ? [stationId] : []);
      
      return {
        stations: stationResult.rows[0],
        tanks: tankResult.rows[0],
        sales: salesResult.rows[0],
        recentActivity: activityResult.rows,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Get dashboard data error:', error);
      throw error;
    }
  }

  static async getTrends(startDate, endDate, stationId, type = 'sales') {
    try {
      let query;
      const params = [startDate, endDate];
      
      if (type === 'sales') {
        query = `
          SELECT DATE(transaction_date) as date,
                 COUNT(*) as transactions,
                 SUM(total_amount) as revenue,
                 SUM(volume) as volume
          FROM sales_transactions
          WHERE transaction_date BETWEEN $1 AND $2
        `;
        
        if (stationId) {
          query += ` AND station_id = $3`;
          params.push(stationId);
        }
        
        query += ` GROUP BY DATE(transaction_date) ORDER BY date`;
        
      } else if (type === 'inventory') {
        query = `
          SELECT DATE(reading_timestamp) as date,
                 AVG(total_volume) as avg_volume,
                 MIN(total_volume) as min_volume,
                 MAX(total_volume) as max_volume
          FROM tank_readings tr
          JOIN tanks t ON tr.tank_id = t.id
          WHERE reading_timestamp BETWEEN $1 AND $2
        `;
        
        if (stationId) {
          query += ` AND t.station_id = $3`;
          params.push(stationId);
        }
        
        query += ` GROUP BY DATE(reading_timestamp) ORDER BY date`;
      }
      
      const result = await dbManager.query(query, params);
      
      return {
        type,
        period: { startDate, endDate },
        data: result.rows
      };
    } catch (error) {
      logger.error('Get trends error:', error);
      throw error;
    }
  }

  static async getEfficiencyMetrics(startDate, endDate, stationId) {
    try {
      let query = `
        SELECT 
          s.name as station_name,
          COUNT(DISTINCT st.id) as total_transactions,
          SUM(st.volume) as total_volume,
          SUM(st.total_amount) as total_revenue,
          AVG(st.total_amount / NULLIF(st.volume, 0)) as avg_price_per_liter,
          COUNT(DISTINCT DATE(st.transaction_date)) as active_days
        FROM stations s
        LEFT JOIN sales_transactions st ON s.id = st.station_id
          AND st.transaction_date BETWEEN $1 AND $2
      `;
      
      const params = [startDate, endDate];
      
      if (stationId) {
        query += ` WHERE s.id = $3`;
        params.push(stationId);
      }
      
      query += ` GROUP BY s.id, s.name ORDER BY total_revenue DESC`;
      
      const result = await dbManager.query(query, params);
      
      return {
        period: { startDate, endDate },
        metrics: result.rows
      };
    } catch (error) {
      logger.error('Get efficiency metrics error:', error);
      throw error;
    }
  }

  static async getAlerts(stationId, severity) {
    try {
      const alerts = [];
      
      // Low inventory alerts
      let inventoryQuery = `
        SELECT t.id, t.tank_number, t.current_level, t.critical_level, t.safe_level,
               s.name as station_name, p.name as product_name
        FROM tanks t
        JOIN stations s ON t.station_id = s.id
        LEFT JOIN products p ON t.product_id = p.id
        WHERE t.current_level <= t.safe_level
      `;
      
      if (stationId) {
        inventoryQuery += ` AND s.id = $1`;
      }
      
      const inventoryResult = await dbManager.query(inventoryQuery, stationId ? [stationId] : []);
      
      inventoryResult.rows.forEach(tank => {
        const alertSeverity = tank.current_level <= tank.critical_level ? 'critical' : 'warning';
        
        if (!severity || severity === alertSeverity) {
          alerts.push({
            id: `tank-low-${tank.id}`,
            type: 'low_inventory',
            severity: alertSeverity,
            title: `Low ${tank.product_name} Level`,
            message: `Tank ${tank.tank_number} at ${tank.station_name} is ${alertSeverity}ly low`,
            data: tank,
            timestamp: new Date().toISOString()
          });
        }
      });
      
      // High temperature alerts
      let tempQuery = `
        SELECT DISTINCT ON (tr.tank_id) 
               tr.tank_id, tr.temperature, t.tank_number, 
               s.name as station_name, p.name as product_name
        FROM tank_readings tr
        JOIN tanks t ON tr.tank_id = t.id
        JOIN stations s ON t.station_id = s.id
        LEFT JOIN products p ON t.product_id = p.id
        WHERE tr.temperature > 35
          AND tr.reading_timestamp >= NOW() - INTERVAL '1 hour'
      `;
      
      if (stationId) {
        tempQuery += ` AND s.id = $1`;
      }
      
      tempQuery += ` ORDER BY tr.tank_id, tr.reading_timestamp DESC`;
      
      const tempResult = await dbManager.query(tempQuery, stationId ? [stationId] : []);
      
      tempResult.rows.forEach(reading => {
        const alertSeverity = reading.temperature > 40 ? 'critical' : 'warning';
        
        if (!severity || severity === alertSeverity) {
          alerts.push({
            id: `temp-high-${reading.tank_id}`,
            type: 'high_temperature',
            severity: alertSeverity,
            title: 'High Temperature Alert',
            message: `Tank ${reading.tank_number} at ${reading.station_name} temperature is ${reading.temperature}°C`,
            data: reading,
            timestamp: new Date().toISOString()
          });
        }
      });
      
      return alerts.sort((a, b) => {
        const severityOrder = { critical: 3, warning: 2, info: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });
    } catch (error) {
      logger.error('Get alerts error:', error);
      throw error;
    }
  }
}