import express from 'express';
import { StationController } from '../controllers/StationController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateCreateStation, validateUpdateStation, validateUUID } from '../middleware/validation.js';

const router = express.Router();

/**
 * @swagger
 * /api/stations:
 *   get:
 *     tags: [Stations]
 *     summary: Get all stations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: regionId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by region
 *     responses:
 *       200:
 *         description: Stations retrieved successfully
 */
router.get('/', authenticate, authorize(['stations.view']), StationController.getAllStations);

/**
 * @swagger
 * /api/stations/accessible:
 *   get:
 *     tags: [Stations]
 *     summary: Get stations accessible to current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Accessible stations retrieved successfully
 */
router.get('/accessible', authenticate, StationController.getAccessibleStations);

router.get('/:id', validateUUID('id'), authenticate, authorize(['stations.view']), StationController.getStationById);
router.post('/', authenticate, authorize(['stations.create']), validateCreateStation, StationController.createStation);
router.put('/:id', validateUUID('id'), authenticate, authorize(['stations.update']), validateUpdateStation, StationController.updateStation);
router.delete('/:id', validateUUID('id'), authenticate, authorize(['stations.delete']), StationController.deleteStation);
router.get('/:id/summary', validateUUID('id'), authenticate, authorize(['stations.view']), StationController.getStationSummary);

export default router;