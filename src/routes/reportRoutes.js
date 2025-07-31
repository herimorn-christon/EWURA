import express from 'express';
import { ReportController } from '../controllers/ReportController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateDateRange } from '../middleware/validation.js';

const router = express.Router();

/**
 * @swagger
 * /api/reports/daily:
 *   get:
 *     tags: [Reports]
 *     summary: Get daily report
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Report date (YYYY-MM-DD)
 *       - in: query
 *         name: stationId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by station
 *     responses:
 *       200:
 *         description: Daily report retrieved successfully
 */
router.get('/daily', authenticate, authorize(['reports.view']), validateDateRange, ReportController.getDailyReport);

router.get('/monthly', authenticate, authorize(['reports.view']), validateDateRange, ReportController.getMonthlyReport);
router.get('/tank-performance', authenticate, authorize(['reports.view']), validateDateRange, ReportController.getTankPerformanceReport);
router.get('/sales-summary', authenticate, authorize(['reports.view']), validateDateRange, ReportController.getSalesSummaryReport);
router.get('/inventory', authenticate, authorize(['reports.view']), ReportController.getInventoryReport);

export default router;