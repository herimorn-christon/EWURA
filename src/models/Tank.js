import { BaseModel } from './BaseModel.js';

export class Tank extends BaseModel {
  constructor() {
    super('tanks');
  }

  async getTanksWithDetails(stationId = null) {
    try {
      let query = `
        SELECT t.*, p.name as product_name, p.color as product_color,
               s.name as station_name, s.code as station_code,
               tr.total_volume as current_total_volume,
               tr.oil_volume as current_oil_volume,
               tr.water_volume as current_water_volume,
               tr.temperature as current_temperature,
               tr.reading_timestamp as last_reading_at
        FROM tanks t
        LEFT JOIN products p ON t.product_id = p.id
        LEFT JOIN stations s ON t.station_id = s.id
        LEFT JOIN LATERAL (
          SELECT total_volume, oil_volume, water_volume, temperature, reading_timestamp
          FROM tank_readings tr_sub
          WHERE tr_sub.tank_id = t.id
          ORDER BY tr_sub.reading_timestamp DESC
          LIMIT 1
        ) tr ON true
      `;
      
      const params = [];
      
      if (stationId) {
        query += ` WHERE t.station_id = $1`;
        params.push(stationId);
      }
      
      query += ` ORDER BY t.tank_number`;
      
      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async getTankReadings(tankId, options = {}) {
    try {
      const { startDate, endDate, limit = 100 } = options;
      
      let query = `
        SELECT * FROM tank_readings
        WHERE tank_id = $1
      `;
      const params = [tankId];
      
      if (startDate) {
        query += ` AND reading_timestamp >= $${params.length + 1}`;
        params.push(startDate);
      }
      
      if (endDate) {
        query += ` AND reading_timestamp <= $${params.length + 1}`;
        params.push(endDate);
      }
      
      query += ` ORDER BY reading_timestamp DESC LIMIT $${params.length + 1}`;
      params.push(limit);
      
      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async addTankReading(tankId, readingData) {
    try {
      const query = `
        INSERT INTO tank_readings (
          tank_id, total_volume, oil_volume, water_volume, tc_volume,
          ullage, oil_height, water_height, temperature
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      const values = [
        tankId,
        readingData.total_volume,
        readingData.oil_volume,
        readingData.water_volume,
        readingData.tc_volume,
        readingData.ullage,
        readingData.oil_height,
        readingData.water_height,
        readingData.temperature
      ];
      
      const result = await this.db.query(query, values);
      
      // Update tank's current level
      await this.update(tankId, {
        current_level: readingData.total_volume,
        temperature: readingData.temperature,
        last_reading_at: new Date()
      });
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

export const tankModel = new Tank();