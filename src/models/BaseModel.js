import { dbManager } from '../database/DatabaseManager.js';
import { DatabaseManager } from '../database/DatabaseManager.js';
import { logger } from '../utils/logger.js';

export class BaseModel {
  constructor(tableName) {
    this.tableName = tableName;
    this.db = dbManager;
  }

  async findAll(conditions = {}, options = {}) {
    try {
      const { orderBy = 'created_at DESC', limit, offset } = options;
      let query = `SELECT * FROM ${this.tableName}`;
      const params = [];
      
      if (Object.keys(conditions).length > 0) {
        const whereClause = Object.keys(conditions)
          .map((key, index) => `${key} = $${index + 1}`)
          .join(' AND ');
        query += ` WHERE ${whereClause}`;
        params.push(...Object.values(conditions));
      }
      
      query += ` ORDER BY ${orderBy}`;
      
      if (limit) {
        query += ` LIMIT ${limit}`;
      }
      
      if (offset) {
        query += ` OFFSET ${offset}`;
      }
      
      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error(`Error finding all from ${this.tableName}:`, error);
      throw error;
    }
  }

  async findById(id) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
      const result = await this.db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error finding by ID from ${this.tableName}:`, error);
      throw error;
    }
  }

  async findOne(conditions) {
    try {
      const whereClause = Object.keys(conditions)
        .map((key, index) => `${key} = $${index + 1}`)
        .join(' AND ');
      
      const query = `SELECT * FROM ${this.tableName} WHERE ${whereClause} LIMIT 1`;
      const result = await this.db.query(query, Object.values(conditions));
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error finding one from ${this.tableName}:`, error);
      throw error;
    }
  }

  async create(data) {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
      
      const query = `
        INSERT INTO ${this.tableName} (${keys.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;
      
      const result = await this.db.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error creating in ${this.tableName}:`, error);
      throw error;
    }
  }

  async update(id, data) {
    try {
      // Filter out undefined values but keep false, 0, empty string, etc.
      const filteredData = {};
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) {
          filteredData[key] = data[key];
        }
      });
      
      const keys = Object.keys(filteredData);
      const values = Object.values(filteredData);
      
      // Add debug logging
      logger.debug(`[BaseModel.update] Called for table: ${this.tableName}, id: ${id}`);
      logger.debug(`[BaseModel.update] Original data:`, data);
      logger.debug(`[BaseModel.update] Filtered data:`, filteredData);
      logger.debug(`[BaseModel.update] Update fields: [${keys.join(', ')}]`);
      logger.debug(`[BaseModel.update] Update values:`, values);
      
      if (keys.length === 0) {
        logger.error(`[BaseModel.update] No fields provided for update on table: ${this.tableName}, id: ${id}`);
        throw new Error('No fields provided for update');
      }
      
      const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
      
      const query = `
        UPDATE ${this.tableName}
        SET ${setClause}, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await this.db.query(query, [id, ...values]);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating in ${this.tableName}:`, error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const query = `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`;
      const result = await this.db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error(`Error deleting from ${this.tableName}:`, error);
      throw error;
    }
  }

  async count(conditions = {}) {
    try {
      let query = `SELECT COUNT(*) FROM ${this.tableName}`;
      const params = [];
      
      if (Object.keys(conditions).length > 0) {
        const whereClause = Object.keys(conditions)
          .map((key, index) => `${key} = $${index + 1}`)
          .join(' AND ');
        query += ` WHERE ${whereClause}`;
        params.push(...Object.values(conditions));
      }
      
      const result = await this.db.query(query, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error(`Error counting from ${this.tableName}:`, error);
      throw error;
    }
  }
}