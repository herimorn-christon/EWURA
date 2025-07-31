import express from 'express';
import { EWURAController } from '../controllers/EWURAController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { 
  validateStationRegistration, 
  validateTransaction, 
  validateDailySummary 
} from '../middleware/validation.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: EWURA
 *   description: EWURA compliance and reporting
 */

/**
 * @swagger
 * /api/ewura/register-station:
 *   post:
 *     tags: [EWURA]
 *     summary: Register station with EWURA
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tranId
 *               - apiSourceId
 *               - retailStationName
 *               - ewuraLicenseNo
 *               - operatorTin
 *               - operatorVrn
 *               - operatorName
 *               - licenseeTraSerialNo
 *               - regionName
 *               - districtName
 *               - wardName
 *               - zone
 *               - contactPersonEmailAddress
 *               - contactPersonPhone
 *             properties:
 *               tranId:
 *                 type: string
 *                 example: "1"
 *               apiSourceId:
 *                 type: string
 *                 example: "109272930_SPAdv2023T"
 *               retailStationName:
 *                 type: string
 *                 example: "ADVATECH FILLING STATION"
 *               ewuraLicenseNo:
 *                 type: string
 *                 example: "PRL-2010-715"
 *               operatorTin:
 *                 type: string
 *                 example: "109272930"
 *               operatorVrn:
 *                 type: string
 *                 example: "40005334W"
 *               operatorName:
 *                 type: string
 *                 example: "OMBOZA"
 *               licenseeTraSerialNo:
 *                 type: string
 *                 example: "10TZ176715"
 *               regionName:
 *                 type: string
 *                 example: "Dar es Salaam"
 *               districtName:
 *                 type: string
 *                 example: "KINONDONI"
 *               wardName:
 *                 type: string
 *                 example: "KINONDONI"
 *               zone:
 *                 type: string
 *                 example: "EAST"
 *               contactPersonEmailAddress:
 *                 type: string
 *                 format: email
 *                 example: "ericprosper5@gmail.com"
 *               contactPersonPhone:
 *                 type: string
 *                 example: "0754100300"
 *     responses:
 *       200:
 *         description: Station registered successfully
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
 *                     result:
 *                       type: object
 *                       properties:
 *                         success:
 *                           type: boolean
 *                           example: true
 *                         xml:
 *                           type: string
 *                           example: "<?xml version=\"1.0\" encoding=\"UTF-8\"?><NPGIS>..."
 *                         submissionId:
 *                           type: string
 *                           format: uuid
 *                         message:
 *                           type: string
 *                           example: "Station registration XML generated successfully"
 *                 message:
 *                   type: string
 *                   example: "Station registered with EWURA successfully"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register-station', authenticate, authorize(['ewura.manage']), validateStationRegistration, EWURAController.registerStation);

/**
 * @swagger
 * /api/ewura/submit-transaction:
 *   post:
 *     tags: [EWURA]
 *     summary: Submit transaction to EWURA
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tranId
 *               - apiSourceId
 *               - rctVerificationCode
 *               - ewuraLicenseNo
 *               - rctDate
 *               - rctTime
 *               - operatorTin
 *               - productName
 *               - unitPrice
 *               - volume
 *               - amount
 *             properties:
 *               tranId:
 *                 type: string
 *               apiSourceId:
 *                 type: string
 *               rctVerificationCode:
 *                 type: string
 *               ewuraLicenseNo:
 *                 type: string
 *               rctDate:
 *                 type: string
 *               rctTime:
 *                 type: string
 *               operatorTin:
 *                 type: string
 *               operatorVrn:
 *                 type: string
 *               operatorName:
 *                 type: string
 *               retailStationName:
 *                 type: string
 *               traSerialNo:
 *                 type: string
 *               productName:
 *                 type: string
 *               unitPrice:
 *                 type: string
 *               volume:
 *                 type: string
 *               amount:
 *                 type: string
 *               discountAmount:
 *                 type: string
 *               amountNew:
 *                 type: string
 *               buyerName:
 *                 type: string
 *               cardDesc:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transaction submitted successfully
 */
router.post('/submit-transaction', authenticate, authorize(['ewura.manage']), validateTransaction, EWURAController.submitTransaction);

router.post('/submit-daily-summary', authenticate, authorize(['ewura.manage']), validateDailySummary, EWURAController.submitDailySummary);
router.get('/submission-history', authenticate, authorize(['ewura.view']), EWURAController.getSubmissionHistory);
router.get('/validate-certificate', authenticate, authorize(['ewura.manage']), EWURAController.validateCertificate);

/**
 * @swagger
 * /api/ewura/registration-data/{managerId}:
 *   get:
 *     tags: [EWURA]
 *     summary: Get auto-filled EWURA registration data for a manager
 *     description: Returns pre-filled EWURA registration data based on manager's station and taxpayer information
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: managerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Manager/User ID
 *         example: 550e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       200:
 *         description: EWURA registration data retrieved successfully
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
 *                     ewuraData:
 *                       type: object
 *                       properties:
 *                         autoFilled:
 *                           type: object
 *                           description: Fields automatically filled from database
 *                         manualFields:
 *                           type: object
 *                           description: Fields that need manual input
 *                         completeData:
 *                           type: object
 *                           description: Complete data structure for EWURA submission
 *                         context:
 *                           type: object
 *                           description: Manager and station context information
 *       404:
 *         description: Manager not found or not authorized
 */
router.get('/registration-data/:managerId', authenticate, authorize(['ewura.view']), EWURAController.getEWURARegistrationData);

/**
 * @swagger
 * /api/ewura/register-with-manager/{managerId}:
 *   post:
 *     tags: [EWURA]
 *     summary: Submit EWURA registration using manager's auto-filled data
 *     description: Combines auto-filled data from manager's profile with manual inputs to submit EWURA registration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: managerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Manager/User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tranId
 *             properties:
 *               tranId:
 *                 type: string
 *                 description: Transaction ID
 *                 example: "1"
 *               brandName:
 *                 type: string
 *                 description: Fuel brand name
 *                 example: "ADVATECH"
 *               stationLocation:
 *                 type: string
 *                 description: Station location (optional, auto-filled)
 *                 example: "Msasani Peninsula, Dar es Salaam"
 *               efdSerialNumber:
 *                 type: string
 *                 description: EFD device serial number
 *                 example: "EFD123456"
 *               receiptCode:
 *                 type: string
 *                 description: Receipt code
 *                 example: "RCP001"
 *     responses:
 *       200:
 *         description: EWURA registration submitted successfully
 */
router.post('/register-with-manager/:managerId', authenticate, authorize(['ewura.manage']), EWURAController.submitEWURARegistrationWithManager);

export default router;