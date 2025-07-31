import { userModel } from '../models/User.js';
import { userRoleModel } from '../models/UserRole.js';
import { generateToken } from '../middleware/auth.js';
import { ApiResponse } from '../views/ApiResponse.js';
import { logger } from '../utils/logger.js';
import { RedisManager } from '../cache/RedisManager.js';
import { dbManager } from '../database/DatabaseManager.js';

export class AuthController {
  static async register(req, res, next) {
    try {
      const { deviceSerial, email, username, password, firstName, lastName, phone, roleCode, stationId } = req.body;
      
      // Check if device serial already exists
      const existingUser = await userModel.findByDeviceSerial(deviceSerial);
      if (existingUser) {
        return ApiResponse.error(res, 'Device serial number already registered. Each device must have a unique serial number.', 409);
      }
      
      // Check if station exists
      if (stationId) {
        const stationExists = await dbManager.query('SELECT id FROM stations WHERE id = $1', [stationId]);
        if (stationExists.rows.length === 0) {
          return ApiResponse.error(res, 'Selected station does not exist', 400);
        }
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
        user_role_id: userRoleId,
        station_id: stationId
      };
      
      const user = await userModel.createUser(userData);
      
      // Get user with role details
      const userWithDetails = await userModel.findByDeviceSerial(deviceSerial);
      
      // Generate token
      const token = generateToken(userWithDetails);
      
      // Remove sensitive data
      delete userWithDetails.password_hash;
      
      logger.info(`User registered: ${deviceSerial}`);
      
      ApiResponse.success(res, {
        user: userWithDetails,
        token
      }, 201, 'Registration successful');
    } catch (error) {
      logger.error('Registration error:', error);
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { deviceSerial, password } = req.body;
      
      // Find user by device serial
      const user = await userModel.findByDeviceSerial(deviceSerial);
      if (!user) {
        return ApiResponse.error(res, 'Invalid device serial or password', 401);
      }
      
      // Check if user is active
      if (!user.is_active) {
        return ApiResponse.error(res, 'Account is deactivated', 401);
      }
      
      // Verify password
      const isValidPassword = await userModel.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        return ApiResponse.error(res, 'Invalid device serial or password', 401);
      }
      
      // Update last login
      await userModel.updateLastLogin(user.id);
      
      // Generate token
      const token = generateToken(user);
      
      // Remove sensitive data
      delete user.password_hash;
      
      logger.info(`User logged in: ${deviceSerial}`);
      
      ApiResponse.success(res, {
        user,
        token
      }, 200, 'Login successful');
    } catch (error) {
      logger.error('Login error:', error);
      next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      const token = req.headers.authorization?.substring(7);
      
      if (token) {
        // Add token to blacklist
        const decoded = jwt.decode(token);
        const expiryTime = decoded.exp - Math.floor(Date.now() / 1000);
        
        if (expiryTime > 0) {
          await RedisManager.set(`blacklist:${token}`, true, expiryTime);
        }
      }
      
      logger.info(`User logged out: ${req.user.device_serial}`);
      
      ApiResponse.success(res, null, 200, 'Logged out successfully');
    } catch (error) {
      logger.error('Logout error:', error);
      next(error);
    }
  }

  static async refreshToken(req, res, next) {
    try {
      const user = req.user;
      
      // Generate new token
      const token = generateToken(user);
      
      logger.info(`Token refreshed: ${user.device_serial}`);
      
      ApiResponse.success(res, {
        token
      }, 200, 'Token refreshed successfully');
    } catch (error) {
      logger.error('Refresh token error:', error);
      next(error);
    }
  }

  static async getProfile(req, res, next) {
    try {
      const user = req.user;
      
      // Remove sensitive data
      const userProfile = { ...user };
      delete userProfile.password_hash;
      
      ApiResponse.success(res, {
        user: userProfile
      }, 200, 'Profile retrieved successfully');
    } catch (error) {
      logger.error('Get profile error:', error);
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const { firstName, lastName, phone } = req.body;
      
      const updateData = {};
      if (firstName) updateData.first_name = firstName;
      if (lastName) updateData.last_name = lastName;
      if (phone) updateData.phone = phone;
      
      const updatedUser = await userModel.update(userId, updateData);
      if (!updatedUser) {
        return ApiResponse.error(res, 'User not found', 404);
      }
      
      // Remove sensitive data
      delete updatedUser.password_hash;
      
      logger.info(`Profile updated: ${req.user.device_serial}`);
      
      ApiResponse.success(res, {
        user: updatedUser
      }, 200, 'Profile updated successfully');
    } catch (error) {
      logger.error('Update profile error:', error);
      next(error);
    }
  }

  static async changePassword(req, res, next) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;
      
      // Verify current password
      const user = await userModel.findById(userId);
      const isValidPassword = await userModel.verifyPassword(currentPassword, user.password_hash);
      if (!isValidPassword) {
        return ApiResponse.error(res, 'Current password is incorrect', 400);
      }
      
      // Update password
      await userModel.updatePassword(userId, newPassword);
      
      logger.info(`Password changed: ${req.user.device_serial}`);
      
      ApiResponse.success(res, null, 200, 'Password changed successfully');
    } catch (error) {
      logger.error('Change password error:', error);
      next(error);
    }
  }
}