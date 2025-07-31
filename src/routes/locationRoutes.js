import express from 'express';
import { LocationController } from '../controllers/LocationController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { 
  validateCreateCountry, 
  validateCreateRegion, 
  validateCreateDistrict, 
  validateCreateWard,
  validateCreateStreet,
  validateUpdateCountry,
  validateUpdateRegion,
  validateUpdateDistrict,
  validateUpdateWard,
  validateUpdateStreet,
  validateUUID 
} from '../middleware/validation.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Locations
 *   description: Geographic location management
 */

// Countries
router.get('/countries', authenticate, authorize(['locations.view']), LocationController.getAllCountries);
router.post('/countries', authenticate, authorize(['locations.create']), validateCreateCountry, LocationController.createCountry);
router.get('/countries/:id', validateUUID('id'), authenticate, authorize(['locations.view']), LocationController.getCountryById);
router.put('/countries/:id', validateUUID('id'), authenticate, authorize(['locations.update']), LocationController.updateCountry);
router.delete('/countries/:id', validateUUID('id'), authenticate, authorize(['locations.delete']), LocationController.deleteCountry);

// Regions
router.get('/regions', authenticate, authorize(['locations.view']), LocationController.getAllRegions);
router.post('/regions', authenticate, authorize(['locations.create']), validateCreateRegion, LocationController.createRegion);
router.get('/regions/:id', validateUUID('id'), authenticate, authorize(['locations.view']), LocationController.getRegionById);
router.put('/regions/:id', validateUUID('id'), authenticate, authorize(['locations.update']), LocationController.updateRegion);
router.delete('/regions/:id', validateUUID('id'), authenticate, authorize(['locations.delete']), LocationController.deleteRegion);

// Districts
router.get('/districts', authenticate, authorize(['locations.view']), LocationController.getAllDistricts);
router.post('/districts', authenticate, authorize(['locations.create']), validateCreateDistrict, LocationController.createDistrict);
router.get('/districts/:id', validateUUID('id'), authenticate, authorize(['locations.view']), LocationController.getDistrictById);
router.put('/districts/:id', validateUUID('id'), authenticate, authorize(['locations.update']), LocationController.updateDistrict);
router.delete('/districts/:id', validateUUID('id'), authenticate, authorize(['locations.delete']), LocationController.deleteDistrict);

// Wards
router.get('/wards', authenticate, authorize(['locations.view']), LocationController.getAllWards);
router.post('/wards', authenticate, authorize(['locations.create']), validateCreateWard, LocationController.createWard);
router.get('/wards/:id', validateUUID('id'), authenticate, authorize(['locations.view']), LocationController.getWardById);
router.put('/wards/:id', validateUUID('id'), authenticate, authorize(['locations.update']), LocationController.updateWard);
router.delete('/wards/:id', validateUUID('id'), authenticate, authorize(['locations.delete']), LocationController.deleteWard);

// Streets
router.get('/streets', authenticate, authorize(['locations.view']), LocationController.getAllStreets);
router.post('/streets', authenticate, authorize(['locations.create']), validateCreateStreet, LocationController.createStreet);
router.get('/streets/:id', validateUUID('id'), authenticate, authorize(['locations.view']), LocationController.getStreetById);
router.put('/streets/:id', validateUUID('id'), authenticate, authorize(['locations.update']), LocationController.updateStreet);
router.delete('/streets/:id', validateUUID('id'), authenticate, authorize(['locations.delete']), LocationController.deleteStreet);

export default router;