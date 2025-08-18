import express from 'express';
import { UnifiedInterfaceController } from '../controllers/UnifiedInterfaceController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Interface
 *   description: Unified interface endpoints for NPGIS and NFPP
 */

/**
 * @swagger
 * /api/interface/tanks/current:
 *   get:
 *     tags: [Interface]
 *     summary: Get current tank data from any interface
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: stationId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by station ID (admin only)
 *       - in: query
 *         name: interfaceCode
 *         schema:
 *           type: string
 *           enum: [NPGIS, NFPP, ATG, PTS, VFD]
 *         description: Filter by interface type
 *     responses:
 *       200:
 *         description: Current tank data retrieved successfully
 */
router.get('/tanks/current', authenticate, UnifiedInterfaceController.getCurrentTankData);

/**
 * @swagger
 * /api/interface/transactions:
 *   get:
 *     tags: [Interface]
 *     summary: Get transactions from any interface
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: stationId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by station ID (admin only)
 *       - in: query
 *         name: interfaceCode
 *         schema:
 *           type: string
 *           enum: [NPGIS, NFPP, ATG, PTS, VFD]
 *         description: Filter by interface type
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum number of transactions
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 */
router.get('/transactions', authenticate, UnifiedInterfaceController.getTransactions);

/**
 * @swagger
 * /api/interface/transactions:
 *   post:
 *     tags: [Interface]
 *     summary: Receive transaction data from external systems
 *     parameters:
 *       - in: header
 *         name: api-key
 *         required: true
 *         schema:
 *           type: string
 *         description: Station API key
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ewuraLicenseNo:
 *                 type: string
 *               transactions:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Transaction data received and processed
 */
router.post('/transactions', UnifiedInterfaceController.receiveTransactionData);

/**
 * @swagger
 * /api/interface/monitoring/start:
 *   post:
 *     tags: [Interface]
 *     summary: Start interface monitoring
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stationId:
 *                 type: string
 *                 format: uuid
 *               interfaceCode:
 *                 type: string
 *                 enum: [NPGIS, NFPP, ATG, PTS, VFD]
 *     responses:
 *       200:
 *         description: Monitoring started successfully
 */
router.post('/monitoring/start', authenticate, UnifiedInterfaceController.startMonitoring);

/**
 * @swagger
 * /api/interface/monitoring/stop:
 *   post:
 *     tags: [Interface]
 *     summary: Stop interface monitoring
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stationId:
 *                 type: string
 *                 format: uuid
 *               interfaceCode:
 *                 type: string
 *                 enum: [NPGIS, NFPP, ATG, PTS, VFD]
 *     responses:
 *       200:
 *         description: Monitoring stopped successfully
 */
router.post('/monitoring/stop', authenticate, UnifiedInterfaceController.stopMonitoring);

/**
 * @swagger
 * /api/interface/status:
 *   get:
 *     tags: [Interface]
 *     summary: Get interface status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: stationId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by station ID
 *       - in: query
 *         name: interfaceCode
 *         schema:
 *           type: string
 *           enum: [NPGIS, NFPP, ATG, PTS, VFD]
 *         description: Filter by interface type
 *     responses:
 *       200:
 *         description: Interface status retrieved successfully
 */
router.get('/status', authenticate, UnifiedInterfaceController.getInterfaceStatus);

/**
 * @swagger
 * /api/interface/stations:
 *   get:
 *     tags: [Interface]
 *     summary: Get stations accessible to current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Accessible stations retrieved successfully
 */
router.get('/stations', authenticate, UnifiedInterfaceController.getAccessibleStations);

export default router;