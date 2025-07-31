import { BaseModel } from './BaseModel.js';

export class TaxpayerModel extends BaseModel {
  constructor() {
    super('taxpayers');
  }

  async findByTin(tin) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE tin = $1`;
      const result = await this.db.query(query, [tin]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  async findByVrn(vrn) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE vrn = $1`;
      const result = await this.db.query(query, [vrn]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  async getTaxpayersWithDetails(filters = {}) {
    try {
      let query = `
        SELECT t.*, s.name as street_name, s.code as street_code,
               w.name as ward_name, w.code as ward_code,
               d.name as district_name, d.code as district_code,
               r.name as region_name, r.code as region_code,
               c.name as country_name, c.code as country_code
        FROM taxpayers t
        LEFT JOIN streets s ON t.street_id = s.id
        LEFT JOIN wards w ON s.ward_id = w.id
        LEFT JOIN districts d ON w.district_id = d.id
        LEFT JOIN regions r ON d.region_id = r.id
        LEFT JOIN countries c ON r.country_id = c.id
      `;
      
      const conditions = [];
      const params = [];
      
      if (filters.isActive !== undefined) {
        conditions.push(`t.is_active = $${params.length + 1}`);
        params.push(filters.isActive);
      }
      
      if (filters.businessType) {
        conditions.push(`t.business_type = $${params.length + 1}`);
        params.push(filters.businessType);
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ` ORDER BY t.business_name`;
      
      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async searchTaxpayers(searchQuery) {
    try {
      const query = `
        SELECT t.*, s.name as street_name, w.name as ward_name,
               d.name as district_name, r.name as region_name
        FROM taxpayers t
        LEFT JOIN streets s ON t.street_id = s.id
        LEFT JOIN wards w ON s.ward_id = w.id
        LEFT JOIN districts d ON w.district_id = d.id
        LEFT JOIN regions r ON d.region_id = r.id
        WHERE (
          t.tin ILIKE $1 OR
          t.vrn ILIKE $1 OR
          t.business_name ILIKE $1 OR
          t.trade_name ILIKE $1
        )
        ORDER BY t.business_name
      `;
      
      const result = await this.db.query(query, [`%${searchQuery}%`]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async getTaxpayerStations(taxpayerId) {
    try {
      const query = `
        SELECT s.*, COUNT(u.id) as user_count, COUNT(tanks.id) as tank_count
        FROM stations s
        LEFT JOIN users u ON s.id = u.station_id AND u.is_active = true
        LEFT JOIN tanks ON s.id = tanks.station_id AND tanks.is_active = true
        WHERE s.taxpayer_id = $1
        GROUP BY s.id
        ORDER BY s.name
      `;
      
      const result = await this.db.query(query, [taxpayerId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async getBusinessTypes() {
    return [
      { code: 'RETAIL_FUEL', name: 'Retail Fuel Station' },
      { code: 'WHOLESALE_FUEL', name: 'Wholesale Fuel Distributor' },
      { code: 'TRANSPORT', name: 'Transportation Company' },
      { code: 'MANUFACTURING', name: 'Manufacturing Company' },
      { code: 'SERVICES', name: 'Service Provider' },
      { code: 'OTHER', name: 'Other Business Type' }
    ];
  }
}

export const taxpayerModel = new TaxpayerModel();