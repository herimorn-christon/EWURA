import { BaseModel } from './BaseModel.js';
import bcrypt from 'bcrypt';

export class User extends BaseModel {
  constructor() {
    super('users');
  }

  async findByEmail(email) {
    try {
      const query = `
        SELECT u.*, ur.code as role_code, ur.name as role_name, ur.permissions,
               s.name as station_name, s.code as station_code
        FROM users u
        LEFT JOIN user_roles ur ON u.user_role_id = ur.id
        LEFT JOIN stations s ON u.station_id = s.id
        WHERE u.email = $1 AND u.is_active = true
      `;
      const result = await this.db.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  async findByDeviceSerial(deviceSerial) {
    try {
      const query = `
        SELECT u.*, ur.code as role_code, ur.name as role_name, ur.permissions,
               s.name as station_name, s.code as station_code
        FROM users u
        LEFT JOIN user_roles ur ON u.user_role_id = ur.id
        LEFT JOIN stations s ON u.station_id = s.id
        WHERE u.device_serial = $1 AND u.is_active = true
      `;
      const result = await this.db.query(query, [deviceSerial]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }
  async findByUsername(username) {
    try {
      const query = `
        SELECT u.*, ur.code as role_code, ur.name as role_name, ur.permissions,
               s.name as station_name, s.code as station_code
        FROM users u
        LEFT JOIN user_roles ur ON u.user_role_id = ur.id
        LEFT JOIN stations s ON u.station_id = s.id
        WHERE u.username = $1 AND u.is_active = true
      `;
      const result = await this.db.query(query, [username]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  async createUser(userData) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const userWithHashedPassword = {
        ...userData,
        password_hash: hashedPassword
      };
      delete userWithHashedPassword.password;
      
      return await this.create(userWithHashedPassword);
    } catch (error) {
      throw error;
    }
  }

  async updatePassword(userId, newPassword) {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      return await this.update(userId, {
        password_hash: hashedPassword,
        password_changed_at: new Date()
      });
    } catch (error) {
      throw error;
    }
  }

  async updateLastLogin(userId) {
    try {
      return await this.update(userId, {
        last_login_at: new Date()
      });
    } catch (error) {
      throw error;
    }
  }

  async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      throw error;
    }
  }

  async searchUsers(query) {
    try {
      const searchQuery = `
        SELECT u.id, u.device_serial, u.email, u.username, u.first_name, u.last_name, u.phone,
               u.is_active, u.email_verified, u.last_login_at, u.created_at,
               ur.code as role_code, ur.name as role_name,
               s.name as station_name, s.code as station_code,
               it.name as interface_type
        FROM users u
        LEFT JOIN user_roles ur ON u.user_role_id = ur.id
        LEFT JOIN stations s ON u.station_id = s.id
        LEFT JOIN interface_types it ON u.interface_type_id = it.id
        WHERE (
          u.device_serial ILIKE $1 OR
          u.email ILIKE $1 OR
          u.username ILIKE $1 OR
          u.first_name ILIKE $1 OR
          u.last_name ILIKE $1 OR
          CONCAT(u.first_name, ' ', u.last_name) ILIKE $1
        )
        ORDER BY u.created_at DESC
      `;
      
      const result = await this.db.query(searchQuery, [`%${query}%`]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async getUsersWithDetails(filters = {}) {
    try {
      let query = `
        SELECT u.id, u.device_serial, u.email, u.username, u.first_name, u.last_name, u.phone,
               u.is_active, u.email_verified, u.last_login_at, u.created_at,
               ur.code as role_code, ur.name as role_name,
               s.name as station_name, s.code as station_code,
               it.name as interface_type
        FROM users u
        LEFT JOIN user_roles ur ON u.user_role_id = ur.id
        LEFT JOIN stations s ON u.station_id = s.id
        LEFT JOIN interface_types it ON u.interface_type_id = it.id
      `;
      
      const conditions = [];
      const params = [];
      
      if (filters.roleCode) {
        conditions.push(`ur.code = $${params.length + 1}`);
        params.push(filters.roleCode);
      }
      
      if (filters.stationId) {
        conditions.push(`u.station_id = $${params.length + 1}`);
        params.push(filters.stationId);
      }
      
      if (filters.isActive !== undefined) {
        conditions.push(`u.is_active = $${params.length + 1}`);
        params.push(filters.isActive);
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ` ORDER BY u.created_at DESC`;
      
      const result = await this.db.query(query, params);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

export const userModel = new User();