import express from 'express';
import { TankController } from '../controllers/TankController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateCreateTank, validateUUID } from '../middleware/validation.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Tanks
 *   description: Tank management and monitoring
 */

/**
 * @swagger
 * /api/tanks:
 *   get:
 *     tags: [Tanks]
 *     summary: Get all tanks
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: stationId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by station
 *         example: 550e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       200:
 *         description: Tanks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     tanks:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Tank'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', authenticate, authorize(['tanks.view']), TankController.getAllTanks);

router.get('/:id', validateUUID('id'), authenticate, authorize(['tanks.view']), TankController.getTankById);
router.post('/', authenticate, authorize(['tanks.create']), validateCreateTank, TankController.createTank);
router.put('/:id', validateUUID('id'), authenticate, authorize(['tanks.update']), TankController.updateTank);
router.delete('/:id', validateUUID('id'), authenticate, authorize(['tanks.delete']), TankController.deleteTank);
router.get('/:id/readings', validateUUID('id'), authenticate, authorize(['tanks.view']), TankController.getTankReadings);

// Real-time tank data endpoints
router.get('/current/data', authenticate, authorize(['tanks.view']), TankController.getCurrentData);

// ATG control endpoints
router.post('/atg/start', authenticate, authorize(['tanks.manage']), TankController.startATGMonitoring);
router.post('/atg/stop', authenticate, authorize(['tanks.manage']), TankController.stopATGMonitoring);
router.get('/atg/status', authenticate, authorize(['tanks.view']), TankController.getATGStatus);

export default router;