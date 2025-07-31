import express from 'express';
import { TaxpayerController } from '../controllers/TaxpayerController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateCreateTaxpayer, validateUpdateTaxpayer, validateUUID } from '../middleware/validation.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Taxpayers
 *   description: Taxpayer and business management
 */

// Main CRUD operations
router.get('/', authenticate, authorize(['taxpayers.view']), TaxpayerController.getAllTaxpayers);
router.post('/', authenticate, authorize(['taxpayers.create']), validateCreateTaxpayer, TaxpayerController.createTaxpayer);
router.get('/search', authenticate, authorize(['taxpayers.view']), TaxpayerController.searchTaxpayers);
router.get('/business-types', authenticate, authorize(['taxpayers.view']), TaxpayerController.getBusinessTypes);

// Lookup operations
router.get('/lookup/tin/:tin', authenticate, authorize(['taxpayers.view']), TaxpayerController.lookupByTin);
router.get('/lookup/vrn/:vrn', authenticate, authorize(['taxpayers.view']), TaxpayerController.lookupByVrn);

// Individual taxpayer operations
router.get('/:id', validateUUID('id'), authenticate, authorize(['taxpayers.view']), TaxpayerController.getTaxpayerById);
router.put('/:id', validateUUID('id'), authenticate, authorize(['taxpayers.update']), validateUpdateTaxpayer, TaxpayerController.updateTaxpayer);
router.delete('/:id', validateUUID('id'), authenticate, authorize(['taxpayers.delete']), TaxpayerController.deleteTaxpayer);
router.get('/:id/stations', validateUUID('id'), authenticate, authorize(['taxpayers.view']), TaxpayerController.getTaxpayerStations);

export default router;