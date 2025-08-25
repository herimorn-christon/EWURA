// src/routes/settingsRoutes.js
import { Router } from 'express';
import { SettingsController } from '../controllers/SettingsController.js';
// If you have auth middleware, import it. Otherwise use a tiny guard that requires req.user.
import { authenticate } from '../middleware/auth.js'; // adjust path/name if different

const router = Router();

/**
 * System settings
 * GET    /api/settings/system
 * PUT    /api/settings/system
 */
router.get('/system', authenticate, SettingsController.getSystemSettings);
router.put('/system', authenticate, SettingsController.updateSystemSettings);

/**
 * User profile settings
 * GET    /api/settings/profile
 * PUT    /api/settings/profile
 */
router.get('/profile', authenticate, SettingsController.getProfile);
router.put('/profile', authenticate, SettingsController.updateProfile);

/**
 * Notification settings
 * GET    /api/settings/notifications
 * PUT    /api/settings/notifications
 */
router.get('/notifications', authenticate, SettingsController.getNotificationSettings);
router.put('/notifications', authenticate, SettingsController.updateNotificationSettings);

export default router;
