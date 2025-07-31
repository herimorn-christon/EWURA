import { BaseModel } from './BaseModel.js';

export class UserRoleModel extends BaseModel {
  constructor() {
    super('user_roles');
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

  async getRolesWithPermissions() {
    try {
      const query = `
        SELECT id, code, name, permissions, description, created_at
        FROM ${this.tableName}
        ORDER BY name
      `;
      const result = await this.db.query(query);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async updatePermissions(roleId, permissions) {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET permissions = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;
      const result = await this.db.query(query, [JSON.stringify(permissions), roleId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

export const userRoleModel = new UserRoleModel();