import { dbManager } from '../database/DatabaseManager.js';
import { userModel } from '../models/User.js';
import { userRoleModel } from '../models/UserRole.js';
import { ApiResponse } from '../views/ApiResponse.js';
import { logger } from '../utils/logger.js';

export class UserController {
  static async getAllUsers(req, res, next) {
    try {
      const { page = 1, limit = 10, roleCode, stationId, isActive, search } = req.query;
      
      // Check if user has ADMIN role
      if (req.user.role_code !== 'ADMIN') {
        return ApiResponse.forbidden(res, 'Only administrators can view all users');
      }
      
      const filters = {};
      if (roleCode) filters.roleCode = roleCode;
      if (stationId) filters.stationId = stationId;
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (search) filters.search = search;

      const users = await userModel.getUsersWithDetails(filters);
      
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedUsers = users.slice(startIndex, endIndex);
      
      ApiResponse.paginated(res, paginatedUsers, {
        page: parseInt(page),
        limit: parseInt(limit),
        total: users.length
      });
    } catch (error) {
      logger.error('Get all users error:', error);
      next(error);
    }
  }

  static async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      
      // Check if user has ADMIN role or is accessing their own profile
      if (req.user.role_code !== 'ADMIN' && req.user.id !== id) {
        return ApiResponse.forbidden(res, 'You can only access your own profile');
      }
      
      const user = await userModel.findById(id);
      
      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }
      
      // Get user with role details
      const userWithDetails = await userModel.findByDeviceSerial(user.device_serial);
      delete userWithDetails.password_hash;
      
      ApiResponse.success(res, { user: userWithDetails });
    } catch (error) {
      logger.error('Get user by ID error:', error);
      next(error);
    }
  }

  static async createUser(req, res, next) {
    try {
      // Only ADMIN can create users
      if (req.user.role_code !== 'ADMIN') {
        return ApiResponse.forbidden(res, 'Only administrators can create users');
      }

      const { 
        deviceSerial, 
        email, 
        username, 
        password, 
        firstName, 
        lastName, 
        roleCode, 
        stationId, 
        phone,
        interfaceTypeId 
      } = req.body;
      
      // Check if device serial already exists
      const existingUser = await userModel.findByDeviceSerial(deviceSerial);
      if (existingUser) {
        return ApiResponse.error(res, 'Device serial number already registered. Each device must have a unique serial number.', 409);
      }
      
      // Check if email already exists (if provided)
      if (email) {
        const existingEmail = await userModel.findByEmail(email);
        if (existingEmail) {
          return ApiResponse.error(res, 'Email address already registered', 409);
        }
      }
      
      // Check if username already exists (if provided)
      if (username) {
        const existingUsername = await userModel.findByUsername(username);
        if (existingUsername) {
          return ApiResponse.error(res, 'Username already taken', 409);
        }
      }
      
      if (stationId) {
        const stationExists = await dbManager.query('SELECT id FROM stations WHERE id = $1', [stationId]);
        if (stationExists.rows.length === 0) {
          return ApiResponse.error(res, 'Selected station does not exist', 400);
        }
      }
      
      // Get role ID if roleCode is provided
      let userRoleId = null;
      if (roleCode) {
        const role = await userRoleModel.findByCode(roleCode);
        if (!role) {
          return ApiResponse.error(res, 'Invalid role code', 400);
        }
        userRoleId = role.id;
      }
      
      // Create user data
      const userData = {
        device_serial: deviceSerial,
        email,
        username,
        password,
        first_name: firstName,
        last_name: lastName,
        phone,
        user_role_id: userRoleId,
        station_id: stationId,
        interface_type_id: interfaceTypeId
      };
      
      const user = await userModel.createUser(userData);
      
      // Get user with role details
      const userWithDetails = await userModel.findByDeviceSerial(deviceSerial);
      delete userWithDetails.password_hash;
      
      logger.info(`User created by ${req.user.device_serial}: ${deviceSerial}`);
      
      ApiResponse.created(res, { user: userWithDetails }, 'User created successfully');
    } catch (error) {
      logger.error('Create user error:', error);
      next(error);
    }
  }

  static async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const { 
        email, 
        username, 
        firstName, 
        lastName, 
        phone, 
        roleCode, 
        stationId, 
        interfaceTypeId,
        isActive 
      } = req.body;
      
      // Check if user has ADMIN role or is updating their own profile
      const isOwnProfile = req.user.id === id;
      const isAdmin = req.user.role_code === 'ADMIN';
      
      if (!isAdmin && !isOwnProfile) {
        return ApiResponse.forbidden(res, 'You can only update your own profile');
      }
      
      // Only ADMIN can change role, station, or active status
      if (!isAdmin && (roleCode || stationId || interfaceTypeId || isActive !== undefined)) {
        return ApiResponse.forbidden(res, 'Only administrators can change role, station, or account status');
      }
      
      const updateData = {};
      if (email) updateData.email = email;
      if (username) updateData.username = username;
      if (firstName) updateData.first_name = firstName;
      if (lastName) updateData.last_name = lastName;
      if (phone) updateData.phone = phone;
      if (stationId) updateData.station_id = stationId;
      if (interfaceTypeId) updateData.interface_type_id = interfaceTypeId;
      if (isActive !== undefined) updateData.is_active = isActive;
      
      // Handle role change
      if (roleCode && isAdmin) {
        const role = await userRoleModel.findByCode(roleCode);
        if (!role) {
          return ApiResponse.error(res, 'Invalid role code', 400);
        }
        updateData.user_role_id = role.id;
      }
      
      // Check for email/username conflicts
      if (email) {
        const existingEmail = await userModel.findByEmail(email);
        if (existingEmail && existingEmail.id !== id) {
          return ApiResponse.error(res, 'Email address already in use', 409);
        }
      }
      
      if (username) {
        const existingUsername = await userModel.findByUsername(username);
        if (existingUsername && existingUsername.id !== id) {
          return ApiResponse.error(res, 'Username already taken', 409);
        }
      }
      
      const user = await userModel.update(id, updateData);
      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }
      
      // Get updated user with role details
      const userWithDetails = await userModel.findByDeviceSerial(user.device_serial);
      delete userWithDetails.password_hash;
      
      logger.info(`User updated by ${req.user.device_serial}: ${user.device_serial}`);
      
      ApiResponse.updated(res, { user: userWithDetails }, 'User updated successfully');
    } catch (error) {
      logger.error('Update user error:', error);
      next(error);
    }
  }

  static async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      
      // Only ADMIN can delete users
      if (req.user.role_code !== 'ADMIN') {
        return ApiResponse.forbidden(res, 'Only administrators can delete users');
      }
      
      // Prevent self-deletion
      if (req.user.id === id) {
        return ApiResponse.error(res, 'You cannot delete your own account', 400);
      }
      
      const user = await userModel.findById(id);
      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }
      
      await userModel.delete(id);
      
      logger.info(`User deleted by ${req.user.device_serial}: ${user.device_serial}`);
      
      ApiResponse.deleted(res, 'User deleted successfully');
    } catch (error) {
      logger.error('Delete user error:', error);
      next(error);
    }
  }

  static async updateUserRole(req, res, next) {
    try {
      const { id } = req.params;
      const { roleCode } = req.body;
      
      // Only ADMIN can change user roles
      if (req.user.role_code !== 'ADMIN') {
        return ApiResponse.forbidden(res, 'Only administrators can change user roles');
      }
      
      if (!roleCode) {
        return ApiResponse.error(res, 'Role code is required', 400);
      }
      
      const role = await userRoleModel.findByCode(roleCode);
      if (!role) {
        return ApiResponse.error(res, 'Invalid role code', 400);
      }
      
      const user = await userModel.update(id, { user_role_id: role.id });
      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }
      
      // Get updated user with role details
      const userWithDetails = await userModel.findByDeviceSerial(user.device_serial);
      delete userWithDetails.password_hash;
      
      logger.info(`User role updated by ${req.user.device_serial}: ${user.device_serial} -> ${roleCode}`);
      
      ApiResponse.updated(res, { user: userWithDetails }, `User role updated to ${roleCode} successfully`);
    } catch (error) {
      logger.error('Update user role error:', error);
      next(error);
    }
  }

  static async updateUserStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      
      // Only ADMIN can change user status
      if (req.user.role_code !== 'ADMIN') {
        return ApiResponse.forbidden(res, 'Only administrators can change user status');
      }
      
      // Prevent self-deactivation
      if (req.user.id === id && isActive === false) {
        return ApiResponse.error(res, 'You cannot deactivate your own account', 400);
      }
      
      if (isActive === undefined) {
        return ApiResponse.error(res, 'isActive status is required', 400);
      }
      
      const user = await userModel.update(id, { is_active: isActive });
      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }
      
      // Get updated user with role details
      const userWithDetails = await userModel.findByDeviceSerial(user.device_serial);
      delete userWithDetails.password_hash;
      
      logger.info(`User status updated by ${req.user.device_serial}: ${user.device_serial} -> ${isActive ? 'Active' : 'Inactive'}`);
      
      ApiResponse.updated(res, { user: userWithDetails }, `User ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      logger.error('Update user status error:', error);
      next(error);
    }
  }

  static async resetUserPassword(req, res, next) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      
      // Only ADMIN can reset passwords
      if (req.user.role_code !== 'ADMIN') {
        return ApiResponse.forbidden(res, 'Only administrators can reset user passwords');
      }
      
      if (!newPassword || newPassword.length < 6) {
        return ApiResponse.error(res, 'New password must be at least 6 characters long', 400);
      }
      
      const user = await userModel.findById(id);
      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }
      
      await userModel.updatePassword(id, newPassword);
      
      logger.info(`Password reset by ${req.user.device_serial} for user: ${user.device_serial}`);
      
      ApiResponse.success(res, null, 200, 'User password reset successfully');
    } catch (error) {
      logger.error('Reset user password error:', error);
      next(error);
    }
  }

  static async getUserRoles(req, res, next) {
    try {
      // Only ADMIN can view all roles
      if (req.user.role_code !== 'ADMIN') {
        return ApiResponse.forbidden(res, 'Only administrators can view user roles');
      }
      
      const roles = await userRoleModel.getRolesWithPermissions();
      
      ApiResponse.success(res, { roles });
    } catch (error) {
      logger.error('Get user roles error:', error);
      next(error);
    }
  }

  static async searchUsers(req, res, next) {
    try {
      const { query, page = 1, limit = 10 } = req.query;
      
      // Only ADMIN can search users
      if (req.user.role_code !== 'ADMIN') {
        return ApiResponse.forbidden(res, 'Only administrators can search users');
      }
      
      if (!query || query.length < 2) {
        return ApiResponse.error(res, 'Search query must be at least 2 characters long', 400);
      }
      
      const users = await userModel.searchUsers(query);
      
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedUsers = users.slice(startIndex, endIndex);
      
      ApiResponse.paginated(res, paginatedUsers, {
        page: parseInt(page),
        limit: parseInt(limit),
        total: users.length
      }, `Found ${users.length} users matching "${query}"`);
    } catch (error) {
      logger.error('Search users error:', error);
      next(error);
    }
  }

  static async getManagers(req, res, next) {
    try {
      // Get all users with MANAGER or ADMIN role who have stations assigned
      const query = `
        SELECT 
          u.id,
          u.device_serial,
          u.first_name,
          u.last_name,
          u.email,
          u.phone,
          u.is_active,
          ur.code as role_code,
          ur.name as role_name,
          s.name as station_name,
          s.code as station_code,
          s.id as station_id
        FROM users u
        LEFT JOIN user_roles ur ON u.user_role_id = ur.id
        LEFT JOIN stations s ON u.station_id = s.id
        WHERE ur.code IN ('MANAGER', 'ADMIN')
          AND u.is_active = true
          AND s.id IS NOT NULL
        ORDER BY u.first_name, u.last_name
      `;
      
      const result = await dbManager.query(query);
      const managers = result.rows.map(manager => ({
        id: manager.id,
        deviceSerial: manager.device_serial,
        firstName: manager.first_name,
        lastName: manager.last_name,
        fullName: `${manager.first_name} ${manager.last_name}`,
        email: manager.email,
        phone: manager.phone,
        roleCode: manager.role_code,
        roleName: manager.role_name,
        stationName: manager.station_name,
        stationCode: manager.station_code,
        stationId: manager.station_id,
        displayName: `${manager.first_name} ${manager.last_name} - ${manager.station_name}`
      }));
      
      logger.info(`Retrieved ${managers.length} managers for EWURA registration`);
      
      ApiResponse.success(res, { 
        managers 
      }, 200, `Found ${managers.length} managers`);
    } catch (error) {
      logger.error('Get managers error:', error);
      next(error);
    }
  }
}