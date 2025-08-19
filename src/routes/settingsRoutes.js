import express from 'express';
import { SettingsController } from '../controllers/SettingsController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: System and user settings management
 */

/**
 * @swagger
 * /api/settings/system:
 *   get:
 *     tags: [Settings]
 *     summary: Get system settings (admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System settings retrieved successfully
 */
router.get('/system', authenticate, authorize(['settings.view']), SettingsController.getSystemSettings);

/**
 * @swagger
 * /api/settings/system:
 *   put:
 *     tags: [Settings]
 *     summary: Update system settings (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: System settings updated successfully
 */
router.put('/system', authenticate, authorize(['settings.update']), SettingsController.updateSystemSettings);

/**
 * @swagger
 * /api/settings/profile:
 *   get:
 *     tags: [Settings]
 *     summary: Get user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 */
router.get('/profile', authenticate, SettingsController.getProfile);

/**
 * @swagger
 * /api/settings/profile:
 *   put:
 *     tags: [Settings]
 *     summary: Update user profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put('/profile', authenticate, SettingsController.updateProfile);

/**
 * @swagger
 * /api/settings/notifications:
 *   get:
 *     tags: [Settings]
 *     summary: Get notification settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification settings retrieved successfully
 */
router.get('/notifications', authenticate, SettingsController.getNotificationSettings);

/**
 * @swagger
 * /api/settings/notifications:
 *   put:
 *     tags: [Settings]
 *     summary: Update notification settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Notification settings updated successfully
 */
router.put('/notifications', authenticate, SettingsController.updateNotificationSettings);

export default router;