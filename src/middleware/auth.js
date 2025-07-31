import jwt from 'jsonwebtoken';
import { userModel } from '../models/User.js';
import { ApiResponse } from '../views/ApiResponse.js';
import { RedisManager } from '../cache/RedisManager.js';
import { logger } from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export const generateToken = (user) => {
  const payload = {
    id: user.id,
    deviceSerial: user.device_serial,
    role: user.role_code || user.roleCode,
    stationId: user.station_id
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.unauthorized(res, 'Access token required');
    }
    
    const token = authHeader.substring(7);
    
    // Check if token is blacklisted
    const isBlacklisted = await RedisManager.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      return ApiResponse.unauthorized(res, 'Token has been revoked');
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get fresh user data WITH ROLE INFORMATION
    const user = await userModel.findByDeviceSerial(decoded.deviceSerial);
    if (!user || !user.is_active) {
      return ApiResponse.unauthorized(res, 'User account is inactive');
    }
    
    // Debug log to see what we're getting
    logger.info('AUTH DEBUG - User object:', JSON.stringify(user, null, 2));
    
    req.user = user;
    req.tokenPayload = decoded;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return ApiResponse.unauthorized(res, 'Invalid token');
    } else if (error.name === 'TokenExpiredError') {
      return ApiResponse.unauthorized(res, 'Token has expired');
    }
    
    logger.error('Authentication error:', error);
    return ApiResponse.error(res, 'Authentication failed', 500);
  }
};

export const authorize = (permissions) => {
  return (req, res, next) => {
    try {
      const user = req.user;
      
      // Admin has all permissions
      if (user.role_code === 'ADMIN' || user.roleCode === 'ADMIN') {
        return next();
      }
      
      // Check if user has required permissions
      const userPermissions = user.permissions || user.role_permissions || [];
      const hasPermission = permissions.some(permission => 
        userPermissions.includes(permission) || userPermissions.includes('*')
      );
      
      if (!hasPermission) {
        return ApiResponse.forbidden(res, 'Insufficient permissions');
      }
      
      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      return ApiResponse.error(res, 'Authorization failed', 500);
    }
  };
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await userModel.findById(decoded.id);
    if (user && user.is_active) {
      req.user = user;
      req.tokenPayload = decoded;
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

// Role-based authorization helpers
export const requireRole = (roles) => {
  return (req, res, next) => {
    const userRole = req.user.role_code;
    
    if (!roles.includes(userRole) && userRole !== 'ADMIN') {
      return ApiResponse.forbidden(res, 'Insufficient role permissions');
    }
    
    next();
  };
};

// Station-based authorization
export const requireStationAccess = (req, res, next) => {
  const userStationId = req.user.station_id;
  const requestedStationId = req.params.stationId || req.body.stationId || req.query.stationId;
  
  // Admin can access all stations
  if (req.user.role_code === 'ADMIN') {
    return next();
  }
  
  // Check if user has access to the requested station
  if (requestedStationId && userStationId !== requestedStationId) {
    return ApiResponse.forbidden(res, 'Access denied to this station');
  }
  
  next();
};

export const logout = async (req, res) => {
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
    
    ApiResponse.success(res, null, 200, 'Logged out successfully');
  } catch (error) {
    logger.error('Logout error:', error);
    ApiResponse.error(res, 'Logout failed', 500);
  }
};