import { tankModel } from '../models/Tank.js';
import { ApiResponse } from '../views/ApiResponse.js';
import { ATGService } from '../services/ATGService.js';
import { logger } from '../utils/logger.js';
import { DatabaseManager } from '../database/DatabaseManager.js';
export class TankController {
  static async getAllTanks(req, res, next) {
    try {
      const { stationId } = req.query;
      const tanks = await tankModel.getTanksWithDetails(stationId);
      
      ApiResponse.success(res, { tanks });
    } catch (error) {
      logger.error('Get all tanks error:', error);
      next(error);
    }
  }

  static async getTankById(req, res, next) {
    try {
      const { id } = req.params;
      const tank = await tankModel.findById(id);
      
      if (!tank) {
        return ApiResponse.error(res, 'Tank not found', 404);
      }
      
      ApiResponse.success(res, { tank });
    } catch (error) {
      logger.error('Get tank by ID error:', error);
      next(error);
    }
  }

  static async createTank(req, res, next) {
    try {
      const {
        stationId,
        tankNumber,
        productId,
        capacity,
        safeLevel,
        criticalLevel
      } = req.body;

      // normalize / coerce types
      const params = [
        stationId,
        tankNumber,
        productId || null,
        capacity !== undefined ? Number(capacity) : null,
        safeLevel !== undefined ? Number(safeLevel) : null,
        criticalLevel !== undefined ? Number(criticalLevel) : null
      ];

      const query = `
        INSERT INTO tanks
          (station_id, tank_number, product_id, capacity, safe_level, critical_level, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *
      `;

      const result = await DatabaseManager.query(query, params);
      const tank = result.rows[0];

      logger.info(`Tank created: ${tank.tank_number} at station ${tank.station_id}`);

      ApiResponse.success(res, { 
        tank,
        message: 'Tank created successfully'
      }, 201);
    } catch (error) {
      logger.error('Create tank error:', error);
      next(error);
    }
  }

  static async updateTank(req, res, next) {
    try {
      const { id } = req.params;
      const {
        stationId,
        tankNumber,
        productId,
        capacity,
        safeLevel,
        criticalLevel
      } = req.body;

      const fields = [];
      const params = [];
      let idx = 1;
      
      const push = (col, val) => {
        if (val !== undefined) {
          fields.push(`${col} = $${idx}`);
          params.push(col === 'capacity' || col.endsWith('_level') ? Number(val) : val);
          idx++;
        }
      };

      push('station_id', stationId);
      push('tank_number', tankNumber);
      push('product_id', productId);
      push('capacity', capacity);
      push('safe_level', safeLevel);
      push('critical_level', criticalLevel);

      if (fields.length === 0) {
        return ApiResponse.error(res, 'No fields to update', 400);
      }

      // always update timestamp
      fields.push(`updated_at = NOW()`);

      const query = `
        UPDATE tanks
        SET ${fields.join(', ')}
        WHERE id = $${idx}
        RETURNING *
      `;
      params.push(id);

      const result = await DatabaseManager.query(query, params);
      const tank = result.rows[0];

      if (!tank) {
        return ApiResponse.error(res, 'Tank not found', 404);
      }

      logger.info(`Tank updated: ${tank.tank_number}`);

      ApiResponse.success(res, {
        tank,
        message: 'Tank updated successfully'
      });
    } catch (error) {
      logger.error('Update tank error:', error);
      next(error);
    }
  }

  static async deleteTank(req, res, next) {
    try {
      const { id } = req.params;
      
      const tank = await tankModel.delete(id);
      if (!tank) {
        return ApiResponse.error(res, 'Tank not found', 404);
      }
      
      logger.info(`Tank deleted: ${tank.tank_number}`);
      
      ApiResponse.success(res, {
        message: 'Tank deleted successfully'
      });
    } catch (error) {
      logger.error('Delete tank error:', error);
      next(error);
    }
  }

  static async getTankReadings(req, res, next) {
    try {
      const { id } = req.params;
      const { startDate, endDate, limit } = req.query;
      
      const readings = await tankModel.getTankReadings(id, {
        startDate,
        endDate,
        limit: parseInt(limit) || 100
      });
      
      ApiResponse.success(res, { readings });
    } catch (error) {
      logger.error('Get tank readings error:', error);
      next(error);
    }
  }

  static async getCurrentData(req, res, next) {
    try {
      const tanks = await ATGService.getCurrentTankData();
      
      ApiResponse.success(res, { tanks });
    } catch (error) {
      logger.error('Get current tank data error:', error);
      next(error);
    }
  }

  static async startATGMonitoring(req, res, next) {
    try {
      await ATGService.startMonitoring();
      
      ApiResponse.success(res, {
        message: 'ATG monitoring started successfully'
      });
    } catch (error) {
      logger.error('Start ATG monitoring error:', error);
      next(error);
    }
  }

  static async stopATGMonitoring(req, res, next) {
    try {
      await ATGService.stopMonitoring();
      
      ApiResponse.success(res, {
        message: 'ATG monitoring stopped successfully'
      });
    } catch (error) {
      logger.error('Stop ATG monitoring error:', error);
      next(error);
    }
  }

  static async getATGStatus(req, res, next) {
    try {
      const status = ATGService.getStatus();
      
      ApiResponse.success(res, { status });
    } catch (error) {
      logger.error('Get ATG status error:', error);
      next(error);
    }
  }

  // NEW: Get tank readings for specific period
  static async getTankReadingsForPeriod(req, res, next) {
    try {
      const { tankId } = req.params;
      const { startDate, endDate, limit = 100 } = req.query;
      
      if (!startDate || !endDate) {
        return ApiResponse.error(res, 'startDate and endDate are required', 400);
      }
      
      const readings = await ATGService.getTankReadingsForPeriod(tankId, startDate, endDate, parseInt(limit));
      
      ApiResponse.success(res, { 
        readings,
        period: { startDate, endDate },
        count: readings.length
      });
    } catch (error) {
      logger.error('Get tank readings for period error:', error);
      next(error);
    }
  }

  // NEW: Get daily tank summary
  static async getDailyTankSummary(req, res, next) {
    try {
      const { date, stationId } = req.query;
      const reportDate = date || new Date().toISOString().split('T')[0];
      
      const summary = await ATGService.getDailyTankSummary(reportDate, stationId);
      
      ApiResponse.success(res, { 
        summary,
        date: reportDate,
        stationId: stationId || 'all'
      });
    } catch (error) {
      logger.error('Get daily tank summary error:', error);
      next(error);
    }
  }

  // NEW: Get hourly tank readings
  static async getHourlyReadings(req, res, next) {
    try {
      const { date, stationId } = req.query;
      const reportDate = date || new Date().toISOString().split('T')[0];
      
      let query = `
        SELECT 
          t.tank_number,
          p.name as product_name,
          s.name as station_name,
          DATE_TRUNC('hour', tr.reading_timestamp) as hour,
          AVG(tr.total_volume) as avg_volume,
          AVG(tr.temperature) as avg_temperature,
          COUNT(tr.id) as reading_count
        FROM tank_readings tr
        JOIN tanks t ON tr.tank_id = t.id
        LEFT JOIN products p ON t.product_id = p.id
        LEFT JOIN stations s ON t.station_id = s.id
        WHERE DATE(tr.reading_timestamp) = $1
      `;
      
      const params = [reportDate];
      
      if (stationId) {
        query += ` AND t.station_id = $2`;
        params.push(stationId);
      }
      
      query += ` GROUP BY t.tank_number, p.name, s.name, DATE_TRUNC('hour', tr.reading_timestamp)
                 ORDER BY hour DESC, t.tank_number`;
      
      const result = await DatabaseManager.query(query, params);
      
      ApiResponse.success(res, { 
        hourlyReadings: result.rows,
        date: reportDate,
        stationId: stationId || 'all'
      });
    } catch (error) {
      logger.error('Get hourly readings error:', error);
      next(error);
    }
  }
}