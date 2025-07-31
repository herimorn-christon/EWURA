import { tankModel } from '../models/Tank.js';
import { ApiResponse } from '../views/ApiResponse.js';
import { ATGService } from '../services/ATGService.js';
import { logger } from '../utils/logger.js';

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
      const tankData = req.body;
      const tank = await tankModel.create(tankData);
      
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
      const tankData = req.body;
      
      const tank = await tankModel.update(id, tankData);
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
}