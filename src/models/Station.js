import { BaseModel } from './BaseModel.js';
import { DatabaseManager } from '../database/DatabaseManager.js';
import { generateStationApiKey } from '../utils/apiKeyGenerator.js';
import { logger } from '../utils/logger.js';

export class Station extends BaseModel {
  constructor() {
    super('stations');
  }

  async getStationsWithDetails(filters = {}) {
    try {
      const { isActive, regionId, excludeAdminStations } = filters;
      
      let query = `
        SELECT s.*, 
               it.code AS interface_code,
               it.name AS interface_type_name,
               r.code AS role_code,
               r.name AS role_name
        FROM stations s
        LEFT JOIN interface_types it ON s.interface_type_id = it.id
        LEFT JOIN users u ON s.id = u.station_id
        LEFT JOIN user_roles r ON u.user_role_id = r.id
        WHERE 1=1
      `;
      
      const params = [];
      
      if (isActive !== undefined) {
        params.push(isActive);
        query += ` AND s.is_active = $${params.length}`;
      }
      
      if (regionId) {
        params.push(regionId);
        query += ` AND s.region_id = $${params.length}`;
      }
      
      if (excludeAdminStations) {
        query += `
          AND NOT EXISTS (
            SELECT 1 FROM users u2 
            JOIN user_roles r2 ON u2.user_role_id = r2.id
            WHERE u2.station_id = s.id 
            AND r2.code = 'ADMIN'
          )
        `;
      }
      
      query += ' ORDER BY s.name';
      
      const result = await DatabaseManager.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('getStationsWithDetails error:', error);
      throw error;
    }
  }

  async getStationSummary(stationId) {
    try {
      const query = `
        SELECT s.*, 
               COUNT(DISTINCT tanks.id) as tank_count,
               COUNT(DISTINCT pumps.id) as pump_count,
               COUNT(DISTINCT users.id) as user_count
        FROM stations s
        LEFT JOIN tanks ON s.id = tanks.station_id AND tanks.is_active = true
        LEFT JOIN pumps ON s.id = pumps.station_id AND pumps.is_active = true
        LEFT JOIN users ON s.id = users.station_id AND users.is_active = true
        WHERE s.id = $1
        GROUP BY s.id
      `;
      
      const result = await this.db.query(query, [stationId]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  async update(id, data) {
    try {
      // Ensure interface_type_id is not null
      if (!data.interface_type_id) {
        throw new Error('Interface type ID cannot be null');
      }

      const result = await DatabaseManager.query(`
        UPDATE stations 
        SET 
          code = COALESCE($1, code),
          name = COALESCE($2, name),
          taxpayer_id = COALESCE($3, taxpayer_id),
          street_id = COALESCE($4, street_id),
          address = COALESCE($5, address),
          ewura_license_no = COALESCE($6, ewura_license_no),
          operational_hours = COALESCE($7, operational_hours),
          coordinates = COALESCE($8, coordinates),
          interface_type_id = $9,
          is_active = COALESCE($10, is_active),
          updated_at = NOW()
        WHERE id = $11
        RETURNING *
      `, [
        data.code,
        data.name,
        data.taxpayer_id,
        data.street_id,
        data.address,
        data.ewura_license_no,
        data.operational_hours,
        data.coordinates,
        data.interface_type_id, // Required field
        data.is_active,
        id
      ]);

      return result.rows[0];
    } catch (error) {
      logger.error('Station update error:', error);
      throw error;
    }
  }

  async create(data) {
    try {
      // Generate API key using station code
      const apiKey = generateStationApiKey(data.code);

      const result = await DatabaseManager.query(`
        INSERT INTO stations (
          code,
          name,
          taxpayer_id,
          street_id,
          address,
          ewura_license_no,
          operational_hours,
          coordinates,
          interface_type_id,
          api_key
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        data.code,
        data.name,
        data.taxpayer_id,
        data.street_id,
        data.address,
        data.ewura_license_no,
        data.operational_hours,
        data.coordinates,
        data.interface_type_id,
        apiKey
      ]);

      logger.info(`Station created with API key: ${data.code}`);
      return result.rows[0];
    } catch (error) {
      logger.error('Station creation error:', error);
      throw error;
    }
  }

  async findByApiKey(apiKey) {
    try {
      const result = await DatabaseManager.query(`
        SELECT 
          id, 
          code,
          name,
          ewura_license_no,
          interface_type_id,
          is_active
        FROM stations 
        WHERE api_key = $1 AND is_active = true
      `, [apiKey]);

      return result.rows[0];
    } catch (error) {
      logger.error('Find station by API key error:', error);
      throw error;
    }
  }

  async getAccessibleStations(userId, excludeAdminStations = false) {
    try {
      let query = `
        SELECT DISTINCT s.*, 
               it.code AS interface_code,
               it.name AS interface_type_name,
               r.code AS role_code,
               r.name AS role_name
        FROM stations s
        LEFT JOIN interface_types it ON s.interface_type_id = it.id
        LEFT JOIN users u ON s.id = u.station_id
        LEFT JOIN user_roles r ON u.user_role_id = r.id
        WHERE u.id = $1
      `;
      
      const params = [userId];
      
      if (excludeAdminStations) {
        query += `
          AND NOT EXISTS (
            SELECT 1 FROM users u2 
            JOIN user_roles r2 ON u2.user_role_id = r2.id
            WHERE u2.station_id = s.id 
            AND r2.code = 'ADMIN'
          )
        `;
      }
      
      query += ' ORDER BY s.name';
      
      const result = await DatabaseManager.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('getAccessibleStations error:', error);
      throw error;
    }
  }
}

export const stationModel = new Station();