import { BaseModel } from './BaseModel.js';

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
        conditions.push(`s.is_active = $${params.length + 1}`);
        params.push(filters.isActive);
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
}

export const stationModel = new Station();