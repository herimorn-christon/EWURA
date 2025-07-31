import { ReportService } from '../services/ReportService.js';
import { ApiResponse } from '../views/ApiResponse.js';
import { logger } from '../utils/logger.js';

export class ReportController {
  static async getDailyReport(req, res, next) {
    try {
      const { date, stationId } = req.query;
      const report = await ReportService.generateDailyReport(date, stationId);
      
      ApiResponse.success(res, { report });
    } catch (error) {
      logger.error('Get daily report error:', error);
      next(error);
    }
  }

  static async getMonthlyReport(req, res, next) {
    try {
      const { year, month, stationId } = req.query;
      const report = await ReportService.generateMonthlyReport(year, month, stationId);
      
      ApiResponse.success(res, { report });
    } catch (error) {
      logger.error('Get monthly report error:', error);
      next(error);
    }
  }

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
}