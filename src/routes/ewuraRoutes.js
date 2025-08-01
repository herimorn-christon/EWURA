import express from 'express';
import { EWURAController } from '../controllers/EWURAController.js';

const router = express.Router();

router.post('/register', EWURAController.registerStation);
router.post('/transaction', EWURAController.submitTransaction);
router.post('/daily-summary', EWURAController.submitDailySummary);
router.get('/history', EWURAController.getSubmissionHistory);
router.get('/certificate/validate', EWURAController.validateCertificate);
router.get('/registration-data/:managerId', EWURAController.getEWURARegistrationData);
router.post('/registration/manager/:managerId', EWURAController.submitEWURARegistrationWithManager);
router.get('/submission/:submissionId', EWURAController.getEWURASubmissionStatus);
router.get('/successful-registrations', EWURAController.getSuccessfulRegistrations);
router.get('/registration-data-duplicate/:managerId', EWURAController.getEWURARegistrationDataDuplicate);

export default router;