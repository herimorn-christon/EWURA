import { BaseModel } from './BaseModel.js';

// Country Model
export class CountryModel extends BaseModel {
  constructor() {
    super('countries');
  }

  async findByCode(code) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE code = $1`;
      const result = await this.db.query(query, [code]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  async getAll() {
    try {
      const query = `SELECT * FROM ${this.tableName} ORDER BY name`;
      const result = await this.db.query(query);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

// Region Model
export class RegionModel extends BaseModel {
  constructor() {
    super('regions');
  }

  async findByCode(code) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE code = $1`;
      const result = await this.db.query(query, [code]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  async getRegionsWithDetails() {
    try {
      const query = `
        SELECT r.*, c.name as country_name, c.code as country_code
        FROM regions r
        LEFT JOIN countries c ON r.country_id = c.id
        ORDER BY c.name, r.name
      `;
      const result = await this.db.query(query);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async getRegionsByCountry(countryId) {
    try {
      const query = `
        SELECT * FROM regions 
        WHERE country_id = $1 
        ORDER BY name
      `;
      const result = await this.db.query(query, [countryId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

// District Model
export class DistrictModel extends BaseModel {
  constructor() {
    super('districts');
  }

  async findByCode(code) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE code = $1`;
      const result = await this.db.query(query, [code]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  async getDistrictsWithDetails() {
    try {
      const query = `
        SELECT d.*, r.name as region_name, r.code as region_code,
               c.name as country_name, c.code as country_code
        FROM districts d
        LEFT JOIN regions r ON d.region_id = r.id
        LEFT JOIN countries c ON r.country_id = c.id
        ORDER BY c.name, r.name, d.name
      `;
      const result = await this.db.query(query);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async getDistrictsByRegion(regionId) {
    try {
      const query = `
        SELECT * FROM districts 
        WHERE region_id = $1 
        ORDER BY name
      `;
      const result = await this.db.query(query, [regionId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

// Ward Model
export class WardModel extends BaseModel {
  constructor() {
    super('wards');
  }

  async findByCode(code) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE code = $1`;
      const result = await this.db.query(query, [code]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  async getWardsWithDetails() {
    try {
      const query = `
        SELECT w.*, d.name as district_name, d.code as district_code,
               r.name as region_name, r.code as region_code,
               c.name as country_name, c.code as country_code
        FROM wards w
        LEFT JOIN districts d ON w.district_id = d.id
        LEFT JOIN regions r ON d.region_id = r.id
        LEFT JOIN countries c ON r.country_id = c.id
        ORDER BY c.name, r.name, d.name, w.name
      `;
      const result = await this.db.query(query);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async getWardsByDistrict(districtId) {
    try {
      const query = `
        SELECT * FROM wards 
        WHERE district_id = $1 
        ORDER BY name
      `;
      const result = await this.db.query(query, [districtId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

// Street Model
export class StreetModel extends BaseModel {
  constructor() {
    super('streets');
  }

  async findByCode(code) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE code = $1`;
      const result = await this.db.query(query, [code]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  async getStreetsWithDetails() {
    try {
      const query = `
        SELECT s.*, w.name as ward_name, w.code as ward_code,
               d.name as district_name, d.code as district_code,
               r.name as region_name, r.code as region_code,
               c.name as country_name, c.code as country_code
        FROM streets s
        LEFT JOIN wards w ON s.ward_id = w.id
        LEFT JOIN districts d ON w.district_id = d.id
        LEFT JOIN regions r ON d.region_id = r.id
        LEFT JOIN countries c ON r.country_id = c.id
        ORDER BY c.name, r.name, d.name, w.name, s.name
      `;
      const result = await this.db.query(query);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async getStreetsByWard(wardId) {
    try {
      const query = `
        SELECT * FROM streets 
        WHERE ward_id = $1 
        ORDER BY name
      `;
      const result = await this.db.query(query, [wardId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

// Export model instances
export const countryModel = new CountryModel();
export const regionModel = new RegionModel();
export const districtModel = new DistrictModel();
export const wardModel = new WardModel();
export const streetModel = new StreetModel();