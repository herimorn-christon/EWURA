import { DatabaseManager } from '../database/DatabaseManager.js';
import { logger } from '../utils/logger.js';

class InterfaceTypeModelClass {
  async getAllTypes() {
    try {
      const result = await DatabaseManager.query(`
        SELECT id, code, name, description, created_at
        FROM interface_types
        ORDER BY code ASC
      `);
      return result.rows;
    } catch (error) {
      logger.error('❌ Error fetching interface types:', error);
      throw error;
    }
  }

  async getTypeByCode(code) {
    try {
      const result = await DatabaseManager.query(`
        SELECT id, code, name, description, created_at
        FROM interface_types
        WHERE code = $1
      `, [code.toUpperCase()]);
      return result.rows[0];
    } catch (error) {
      logger.error('❌ Error fetching interface type:', error);
      throw error;
    }
  }
}

export const InterfaceTypeModel = new InterfaceTypeModelClass();