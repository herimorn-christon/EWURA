import { AnalyticsService } from '../services/AnalyticsService.js';
import { ApiResponse } from '../views/ApiResponse.js';
import { logger } from '../utils/logger.js';

export class AnalyticsController {
  static async getDashboardData(req, res, next) {
    try {
      const { stationId } = req.query;
      const dashboardData = await AnalyticsService.getDashboardData(stationId);
      
      ApiResponse.success(res, { dashboard: dashboardData });
    } catch (error) {
      logger.error('Get dashboard data error:', error);
      next(error);
    }
  }

  static async getTrends(req, res, next) {
    try {
      const { startDate, endDate, stationId, type } = req.query;
      const trends = await AnalyticsService.getTrends(startDate, endDate, stationId, type);
      
      ApiResponse.success(res, { trends });
    } catch (error) {
      logger.error('Get trends error:', error);
      next(error);
    }
  }

  static async getEfficiencyMetrics(req, res, next) {
    try {
      const { startDate, endDate, stationId } = req.query;
      const metrics = await AnalyticsService.getEfficiencyMetrics(startDate, endDate, stationId);
      
      ApiResponse.success(res, { metrics });
    } catch (error) {
      logger.error('Get efficiency metrics error:', error);
      next(error);
    }
  }

  static async getAlerts(req, res, next) {
    try {
      const { stationId, severity } = req.query;
      const alerts = await AnalyticsService.getAlerts(stationId, severity);
      
      ApiResponse.success(res, { alerts });
    } catch (error) {
      logger.error('Get alerts error:', error);
      next(error);
    }
  }
}