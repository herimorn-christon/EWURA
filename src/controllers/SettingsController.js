import { DatabaseManager } from '../database/DatabaseManager.js';
import { ApiResponse } from '../views/ApiResponse.js';
import { logger } from '../utils/logger.js';

export class SettingsController {
  
  /**
   * Get system settings
   */
  static async getSystemSettings(req, res, next) {
    try {
      const user = req.user;

      // Only admin can view system settings
      if (user.role !== 'admin' && user.role_code !== 'ADMIN') {
        return ApiResponse.forbidden(res, 'Only administrators can view system settings');
      }

      const result = await DatabaseManager.query(`
        SELECT category, key, value, description, updated_at
        FROM system_settings
        ORDER BY category, key
      `);

      // Group settings by category
      const settings = result.rows.reduce((acc, row) => {
        if (!acc[row.category]) {
          acc[row.category] = {};
        }
        
        try {
          acc[row.category][row.key] = JSON.parse(row.value);
        } catch {
          acc[row.category][row.key] = row.value;
        }
        
        return acc;
      }, {});

      // Provide defaults if no settings exist
      const defaultSettings = {
        reportGeneration: {
          generationTime: '07:30',
          ewuraSendTime: '08:00',
          timezone: 'Africa/Dar_es_Salaam',
          autoGenerate: true,
          autoSendToEwura: true,
          ...settings.report_generation
        },
        monitoring: {
          tankPollInterval: 10,
          transactionPollInterval: 300,
          anomalyThreshold: 100,
          refillThreshold: 500,
          enableAnomalyDetection: true,
          ...settings.monitoring
        },
        interface: {
          npgisEnabled: true,
          nfppEnabled: true,
          simulationMode: process.env.NODE_ENV !== 'production',
          connectionTimeout: 30,
          ...settings.interface
        },
        notifications: {
          emailEnabled: true,
          smsEnabled: false,
          lowLevelAlerts: true,
          anomalyAlerts: true,
          systemAlerts: true,
          ...settings.notifications
        },
        backup: {
          autoBackup: true,
          backupTime: '02:00',
          retentionDays: 30,
          backupLocation: '/backups',
          ...settings.backup
        }
      };

      ApiResponse.success(res, { settings: defaultSettings });
    } catch (error) {
      logger.error('Get system settings error:', error);
      next(error);
    }
  }

  /**
   * Update system settings
   */
  static async updateSystemSettings(req, res, next) {
    try {
      const user = req.user;
      const newSettings = req.body;

      // Only admin can update system settings
      if (user.role !== 'admin' && user.user_role?.code !== 'ADMIN') {
        return ApiResponse.forbidden(res, 'Only administrators can update system settings');
      }

      // Update settings by category
      for (const [category, categorySettings] of Object.entries(newSettings)) {
        for (const [key, value] of Object.entries(categorySettings as any)) {
          await DatabaseManager.query(`
            INSERT INTO system_settings (category, key, value, updated_by)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (category, key)
            DO UPDATE SET 
              value = EXCLUDED.value, 
              updated_by = EXCLUDED.updated_by, 
              updated_at = NOW()
          `, [
            category.replace(/([A-Z])/g, '_$1').toLowerCase(), // Convert camelCase to snake_case
            key.replace(/([A-Z])/g, '_$1').toLowerCase(),
            JSON.stringify(value),
            user.id
          ]);
        }
      }

      logger.info(`System settings updated by user: ${user.username}`);

      ApiResponse.success(res, {
        settings: newSettings,
        message: 'System settings updated successfully'
      });
    } catch (error) {
      logger.error('Update system settings error:', error);
      next(error);
    }
  }

  /**
   * Get user profile settings
   */
  static async getProfile(req, res, next) {
    try {
      const user = req.user;

      const result = await DatabaseManager.query(`
        SELECT 
          u.id, u.username, u.email, u.first_name, u.last_name, u.phone,
          u.device_serial, u.last_login_at, u.created_at,
          ur.name as role_name, ur.code as role_code,
          s.name as station_name, s.code as station_code
        FROM users u
        LEFT JOIN user_roles ur ON u.user_role_id = ur.id
        LEFT JOIN stations s ON u.station_id = s.id
        WHERE u.id = $1
      `, [user.id]);

      if (result.rows.length === 0) {
        return ApiResponse.notFound(res, 'User not found');
      }

      const profile = result.rows[0];

      ApiResponse.success(res, { profile });
    } catch (error) {
      logger.error('Get profile error:', error);
      next(error);
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req, res, next) {
    try {
      const user = req.user;
      const { firstName, lastName, phone, email } = req.body;

      const result = await DatabaseManager.query(`
        UPDATE users 
        SET 
          first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          phone = COALESCE($3, phone),
          email = COALESCE($4, email),
          updated_at = NOW()
        WHERE id = $5
        RETURNING id, username, email, first_name, last_name, phone
      `, [firstName, lastName, phone, email, user.id]);

      logger.info(`Profile updated for user: ${user.username}`);

      ApiResponse.success(res, {
        profile: result.rows[0],
        message: 'Profile updated successfully'
      });
    } catch (error) {
      logger.error('Update profile error:', error);
      next(error);
    }
  }

  /**
   * Get notification settings
   */
  static async getNotificationSettings(req, res, next) {
    try {
      const user = req.user;

      const result = await DatabaseManager.query(`
        SELECT key, value
        FROM user_settings
        WHERE user_id = $1 AND category = 'notifications'
      `, [user.id]);

      const settings = result.rows.reduce((acc, row) => {
        try {
          acc[row.key] = JSON.parse(row.value);
        } catch {
          acc[row.key] = row.value;
        }
        return acc;
      }, {});

      // Provide defaults
      const defaultSettings = {
        emailEnabled: true,
        smsEnabled: false,
        lowLevelAlerts: true,
        anomalyAlerts: true,
        systemAlerts: true,
        ...settings
      };

      ApiResponse.success(res, { settings: defaultSettings });
    } catch (error) {
      logger.error('Get notification settings error:', error);
      next(error);
    }
  }

  /**
   * Update notification settings
   */
  static async updateNotificationSettings(req, res, next) {
    try {
      const user = req.user;
      const newSettings = req.body;

      // Update each setting
      for (const [key, value] of Object.entries(newSettings)) {
        await DatabaseManager.query(`
          INSERT INTO user_settings (user_id, category, key, value)
          VALUES ($1, 'notifications', $2, $3)
          ON CONFLICT (user_id, category, key)
          DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `, [user.id, key, JSON.stringify(value)]);
      }

      logger.info(`Notification settings updated for user: ${user.username}`);

      ApiResponse.success(res, {
        settings: newSettings,
        message: 'Notification settings updated successfully'
      });
    } catch (error) {
      logger.error('Update notification settings error:', error);
      next(error);
    }
  }
}