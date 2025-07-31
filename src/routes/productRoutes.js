import express from 'express';
import { ProductController } from '../controllers/ProductController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateCreateProduct, validateUUID } from '../middleware/validation.js';

const router = express.Router();

/**
 * @swagger
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: Get all products with current pricing
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 */
router.get('/', authenticate, authorize(['products.view']), ProductController.getAllProducts);

router.get('/:id', validateUUID('id'), authenticate, authorize(['products.view']), ProductController.getProductById);
router.post('/', authenticate, authorize(['products.create']), validateCreateProduct, ProductController.createProduct);
router.put('/:id', validateUUID('id'), authenticate, authorize(['products.update']), ProductController.updateProduct);
router.delete('/:id', validateUUID('id'), authenticate, authorize(['products.delete']), ProductController.deleteProduct);

// Pricing endpoints
router.get('/pricing/current', authenticate, authorize(['products.view']), ProductController.getCurrentPricing);
router.post('/:id/pricing', validateUUID('id'), authenticate, authorize(['products.manage']), ProductController.updatePricing);

export default router;