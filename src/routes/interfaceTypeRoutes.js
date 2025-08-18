import express from 'express';
import { InterfaceTypeController } from '../controllers/InterfaceTypeController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/interface-types:
 *   get:
 *     tags: [Interface Types]
 *     summary: Get all interface types
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Interface types retrieved successfully
 */
router.get('/', authenticate, authorize(['interfaces.view']), InterfaceTypeController.getAllTypes);

/**
 * @swagger
 * /api/interface-types/{code}:
 *   get:
 *     tags: [Interface Types]
 *     summary: Get interface type by code
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Interface type retrieved successfully
 *       404:
 *         description: Interface type not found
 */
router.get('/:code', authenticate, authorize(['interfaces.view']), InterfaceTypeController.getTypeByCode);

export default router;