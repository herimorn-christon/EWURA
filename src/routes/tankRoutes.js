import express from 'express';
import { TankController } from '../controllers/TankController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateCreateTank, validateUUID } from '../middleware/validation.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Tanks
 *   description: Tank management and ATG monitoring
 */

/**
 * @swagger
 * /api/tanks:
 *   get:
 *     tags: [Tanks]
 *     summary: Get all tanks with details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: stationId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by station ID
 *     responses:
 *       200:
 *         description: Tanks retrieved successfully
 */
router.get('/', authenticate, TankController.getAllTanks);

/**
 * @swagger
 * /api/tanks/current/data:
 *   get:
 *     tags: [Tanks]
 *     summary: Get current tank data from ATG
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current tank data retrieved successfully
 */
router.get('/current/data', authenticate, TankController.getCurrentData);

/**
 * @swagger
 * /api/tanks/daily-summary:
 *   get:
 *     tags: [Tanks]
 *     summary: Get daily tank summary
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Report date (YYYY-MM-DD), defaults to today
 *       - in: query
 *         name: stationId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by station ID
 *     responses:
 *       200:
 *         description: Daily tank summary retrieved successfully
 */
router.get('/daily-summary', authenticate, TankController.getDailyTankSummary);

/**
 * @swagger
 * /api/tanks/hourly-readings:
 *   get:
 *     tags: [Tanks]
 *     summary: Get hourly tank readings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Report date (YYYY-MM-DD), defaults to today
 *       - in: query
 *         name: stationId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by station ID
 *     responses:
 *       200:
 *         description: Hourly tank readings retrieved successfully
 */
router.get('/hourly-readings', authenticate, TankController.getHourlyReadings);

/**
 * @swagger
 * /api/tanks/atg/start:
 *   post:
 *     tags: [Tanks]
 *     summary: Start ATG monitoring
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ATG monitoring started successfully
 */
router.post('/atg/start', authenticate, TankController.startATGMonitoring);

/**
 * @swagger
 * /api/tanks/atg/stop:
 *   post:
 *     tags: [Tanks]
 *     summary: Stop ATG monitoring
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ATG monitoring stopped successfully
 */
router.post('/atg/stop', authenticate, TankController.stopATGMonitoring);

/**
 * @swagger
 * /api/tanks/atg/status:
 *   get:
 *     tags: [Tanks]
 *     summary: Get ATG monitoring status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ATG status retrieved successfully
 */
router.get('/atg/status', authenticate, TankController.getATGStatus);

/**
 * @swagger
 * /api/tanks/{tankId}/readings/period:
 *   get:
 *     tags: [Tanks]
 *     summary: Get tank readings for specific period
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tankId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tank ID
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of readings
 *     responses:
 *       200:
 *         description: Tank readings retrieved successfully
 */
router.get('/:tankId/readings/period', validateUUID('tankId'), authenticate, TankController.getTankReadingsForPeriod);

/**
 * @swagger
 * /api/tanks/{id}:
 *   get:
 *     tags: [Tanks]
 *     summary: Get tank by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tank ID
 *     responses:
 *       200:
 *         description: Tank retrieved successfully
 */
router.get('/:id', validateUUID('id'), authenticate, TankController.getTankById);

/**
 * @swagger
 * /api/tanks:
 *   post:
 *     tags: [Tanks]
 *     summary: Create new tank
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stationId
 *               - tankNumber
 *               - capacity
 *             properties:
 *               stationId:
 *                 type: string
 *                 format: uuid
 *               tankNumber:
 *                 type: string
 *               productId:
 *                 type: string
 *                 format: uuid
 *               capacity:
 *                 type: number
 *               safeLevel:
 *                 type: number
 *               criticalLevel:
 *                 type: number
 *     responses:
 *       201:
 *         description: Tank created successfully
 */
router.post('/', authenticate, validateCreateTank, TankController.createTank);

/**
 * @swagger
 * /api/tanks/{id}:
 *   put:
 *     tags: [Tanks]
 *     summary: Update tank
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tank ID
 *     responses:
 *       200:
 *         description: Tank updated successfully
 */
router.put('/:id', validateUUID('id'), authenticate, TankController.updateTank);

/**
 * @swagger
 * /api/tanks/{id}:
 *   delete:
 *     tags: [Tanks]
 *     summary: Delete tank
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tank ID
 *     responses:
 *       200:
 *         description: Tank deleted successfully
 */
router.delete('/:id', validateUUID('id'), authenticate, TankController.deleteTank);

/**
 * @swagger
 * /api/tanks/{id}/readings:
 *   get:
 *     tags: [Tanks]
 *     summary: Get tank readings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tank ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of readings
 *     responses:
 *       200:
 *         description: Tank readings retrieved successfully
 */
router.get('/:id/readings', validateUUID('id'), authenticate, TankController.getTankReadings);

export default router;