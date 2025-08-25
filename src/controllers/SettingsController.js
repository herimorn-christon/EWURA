// src/controllers/SettingsController.js
import { DatabaseManager } from '../database/DatabaseManager.js';
import { ApiResponse } from '../views/ApiResponse.js';
import { logger } from '../utils/logger.js';

const camelToSnake = s => String(s).replace(/([A-Z])/g, '_$1').toLowerCase();
const snakeToCamel = s => String(s).replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const parseJsonSafe = t => { try { return JSON.parse(t); } catch { return t; } };
const isAdmin = u => u?.role === 'admin' || u?.role_code === 'ADMIN' || u?.user_role?.code === 'ADMIN';
const isHHMM = s => typeof s === 'string' && /^\d{2}:\d{2}$/.test(s);

export class SettingsController {
  static async getSystemSettings(req, res, next) {
    try {
      const user = req.user;
      if (!isAdmin(user)) return ApiResponse.forbidden(res, 'Only administrators can view system settings');

      // With UNIQUE(category,key), there should be only one row per pair.
      // Still, we’ll sort by updated_at desc to be safe and pick first.
      const result = await DatabaseManager.query(`
        SELECT category, key, value, description, updated_at
        FROM system_settings
        ORDER BY category, key, updated_at DESC, id DESC
      `);

      const latest = {};
      for (const row of result.rows) {
        const cat = row.category;
        const k = row.key;
        if (!latest[cat]) latest[cat] = {};
        if (latest[cat][k] === undefined) latest[cat][k] = parseJsonSafe(row.value);
      }

      // Convert snake_case -> camelCase
      const norm = {};
      for (const [cat, kv] of Object.entries(latest)) {
        const camCat = snakeToCamel(cat);
        norm[camCat] = norm[camCat] || {};
        for (const [k, v] of Object.entries(kv)) {
          norm[camCat][snakeToCamel(k)] = v;
        }
      }

      const defaultSettings = {
        reportGeneration: {
          generationTime: '07:30',
          ewuraSendTime: '08:00',
          timezone: 'Africa/Dar_es_Salaam',
          autoGenerate: true,
          autoSendToEwura: true,
          ...(norm.reportGeneration || {}),
        },
        monitoring: {
          tankPollInterval: 10,
          transactionPollInterval: 300,
          anomalyThreshold: 100,
          refillThreshold: 500,
          enableAnomalyDetection: true,
          ...(norm.monitoring || {}),
        },
        interface: {
          npgisEnabled: true,
          nfppEnabled: true,
          simulationMode: process.env.NODE_ENV !== 'production',
          connectionTimeout: 30,
          ...(norm.interface || {}),
        },
        notifications: {
          emailEnabled: true,
          smsEnabled: false,
          lowLevelAlerts: true,
          anomalyAlerts: true,
          systemAlerts: true,
          ...(norm.notifications || {}),
        },
        backup: {
          autoBackup: true,
          backupTime: '02:00',
          retentionDays: 30,
          backupLocation: '/backups',
          ...(norm.backup || {}),
        },
      };

      return ApiResponse.success(res, { settings: defaultSettings });
    } catch (err) {
      logger.error('Get system settings error:', err);
      return next(err);
    }
  }

  static async updateSystemSettings(req, res, next) {
    try {
      const user = req.user;
      const newSettings = req.body || {};
      if (!isAdmin(user)) return ApiResponse.forbidden(res, 'Only administrators can update system settings');

      const rg = newSettings.reportGeneration || {};
      const bk = newSettings.backup || {};
      if (rg.generationTime && !isHHMM(rg.generationTime)) {
        return ApiResponse.badRequest(res, 'reportGeneration.generationTime must be HH:MM');
      }
      if (rg.ewuraSendTime && !isHHMM(rg.ewuraSendTime)) {
        return ApiResponse.badRequest(res, 'reportGeneration.ewuraSendTime must be HH:MM');
      }
      if (bk.backupTime && !isHHMM(bk.backupTime)) {
        return ApiResponse.badRequest(res, 'backup.backupTime must be HH:MM');
      }

      for (const [category, categorySettings] of Object.entries(newSettings)) {
        const catSnake = camelToSnake(category);
        for (const [key, value] of Object.entries(categorySettings)) {
          const keySnake = camelToSnake(key);
          await DatabaseManager.query(
            `
            INSERT INTO system_settings (category, key, value, description, updated_by, created_at, updated_at)
            VALUES ($1, $2, $3, NULL, $4, NOW(), NOW())
            ON CONFLICT (category, key)
            DO UPDATE SET
              value = EXCLUDED.value,
              updated_by = EXCLUDED.updated_by,
              updated_at = NOW()
            `,
            [catSnake, keySnake, JSON.stringify(value), user.id]
          );
        }
      }

      // Best-effort: reconfigure backup scheduler
      try {
        const { loadSystemSettings, toBackupSchedulerConfig } = await import('../services/settingsService.js');
        const { reconfigureFromSettings } = await import('../services/backupScheduler.js');
        const sys = await loadSystemSettings();
        const cfg = toBackupSchedulerConfig(sys);
        reconfigureFromSettings(logger, cfg);
      } catch (e) {
        logger.warn('Backup scheduler reconfigure failed:', e?.message || e);
      }

      logger.info(`System settings updated by user: ${user?.username}`);
      return ApiResponse.success(res, {
        settings: newSettings,
        message: 'System settings updated successfully',
      });
    } catch (err) {
      logger.error('Update system settings error:', err);
      return next(err);
    }
  }

  static async getProfile(req, res, next) {
    try {
      const user = req.user;
      const result = await DatabaseManager.query(
        `
        SELECT 
          u.id, u.username, u.email, u.first_name, u.last_name, u.phone,
          u.device_serial, u.last_login_at, u.created_at,
          ur.name as role_name, ur.code as role_code,
          s.name as station_name, s.code as station_code
        FROM users u
        LEFT JOIN user_roles ur ON u.user_role_id = ur.id
        LEFT JOIN stations s ON u.station_id = s.id
        WHERE u.id = $1
      `,
        [user.id]
      );
      if (result.rows.length === 0) return ApiResponse.notFound(res, 'User not found');
      return ApiResponse.success(res, { profile: result.rows[0] });
    } catch (err) {
      logger.error('Get profile error:', err);
      return next(err);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const user = req.user;
      const { firstName, lastName, phone, email } = req.body;
      const result = await DatabaseManager.query(
        `
        UPDATE users 
        SET 
          first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          phone = COALESCE($3, phone),
          email = COALESCE($4, email),
          updated_at = NOW()
        WHERE id = $5
        RETURNING id, username, email, first_name, last_name, phone
      `,
        [firstName, lastName, phone, email, user.id]
      );
      return ApiResponse.success(res, {
        profile: result.rows[0],
        message: 'Profile updated successfully',
      });
    } catch (err) {
      logger.error('Update profile error:', err);
      return next(err);
    }
  }

  static async getNotificationSettings(req, res, next) {
    try {
      const user = req.user;
      const result = await DatabaseManager.query(
        `
        SELECT key, value
        FROM user_settings
        WHERE user_id = $1 AND category = 'notifications'
      `,
        [user.id]
      );

      const settings = result.rows.reduce((acc, row) => {
        acc[snakeToCamel(row.key)] = parseJsonSafe(row.value);
        return acc;
      }, {});

      const defaultSettings = {
        emailEnabled: true,
        smsEnabled: false,
        lowLevelAlerts: true,
        anomalyAlerts: true,
        systemAlerts: true,
        ...settings,
      };

      return ApiResponse.success(res, { settings: defaultSettings });
    } catch (err) {
      logger.error('Get notification settings error:', err);
      return next(err);
    }
  }

  static async updateNotificationSettings(req, res, next) {
    try {
      const user = req.user;
      const newSettings = req.body || {};
      for (const [key, value] of Object.entries(newSettings)) {
        const keySnake = camelToSnake(key);
        await DatabaseManager.query(
          `
          INSERT INTO user_settings (user_id, category, key, value, created_at, updated_at)
          VALUES ($1, 'notifications', $2, $3, NOW(), NOW())
          ON CONFLICT (user_id, category, key)
          DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `,
          [user.id, keySnake, JSON.stringify(value)]
        );
      }
      return ApiResponse.success(res, {
        settings: newSettings,
        message: 'Notification settings updated successfully',
      });
    } catch (err) {
      logger.error('Update notification settings error:', err);
      return next(err);
    }
  }
}
