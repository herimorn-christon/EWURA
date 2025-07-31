import express from 'express';
import { AnalyticsController } from '../controllers/AnalyticsController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateDateRange } from '../middleware/validation.js';

const router = express.Router();

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     tags: [Analytics]
 *     summary: Get dashboard analytics data
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: stationId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by station
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 */
router.get('/dashboard', authenticate, authorize(['analytics.view']), AnalyticsController.getDashboardData);

router.get('/trends', authenticate, authorize(['analytics.view']), validateDateRange, AnalyticsController.getTrends);
router.get('/efficiency', authenticate, authorize(['analytics.view']), validateDateRange, AnalyticsController.getEfficiencyMetrics);
router.get('/alerts', authenticate, authorize(['analytics.view']), AnalyticsController.getAlerts);

export default router;