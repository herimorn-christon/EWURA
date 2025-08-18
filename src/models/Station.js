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
      let query = `
        SELECT s.*, t.business_name as taxpayer_name, t.tin, t.vrn,
               st.name as street_name, w.name as ward_name, d.name as district_name, r.name as region_name,
               it.name as interface_type
        FROM stations s
        LEFT JOIN taxpayers t ON s.taxpayer_id = t.id
        LEFT JOIN streets st ON s.street_id = st.id
        LEFT JOIN wards w ON st.ward_id = w.id
        LEFT JOIN districts d ON w.district_id = d.id
        LEFT JOIN regions r ON d.region_id = r.id
        LEFT JOIN interface_types it ON s.interface_type_id = it.id
      `;
      
      const conditions = [];
      const params = [];
      
      if (filters.isActive !== undefined) {
        // accept boolean or string 'true'
        const isActive = filters.isActive === true || filters.isActive === 'true';
        conditions.push(`s.is_active = $${params.length + 1}`);
        params.push(isActive);
      }
      
      if (filters.regionId) {
        conditions.push(`r.id = $${params.length + 1}`);
        params.push(filters.regionId);
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ` ORDER BY s.created_at DESC`;
      
      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
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

  async getAccessibleStations(userId) {
    const { rows } = await db.query(`
      SELECT DISTINCT 
        s.id,
        s.name,
        s.code,
        s.is_active,
        it.code as interface_code,
        it.name as interface_type_name
      FROM stations s
      INNER JOIN user_stations us ON s.id = us.station_id
      LEFT JOIN interface_types it ON s.interface_type_id = it.id
      WHERE us.user_id = $1 AND s.is_active = true
      ORDER BY s.name
    `, [userId]);
    
    return rows;
  }
}

export const stationModel = new Station();