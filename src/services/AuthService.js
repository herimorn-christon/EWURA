import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { logger } from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export class AuthService {
  static generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role_code || user.role,
      stationId: user.station_id
    };
    
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  static async verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw error;
    }
  }

  static async hashPassword(password) {
    try {
      const saltRounds = 12;
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      logger.error('Password hashing error:', error);
      throw error;
    }
  }

  static async comparePassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      logger.error('Password comparison error:', error);
      throw error;
    }
  }

  static generateRefreshToken(user) {
    const payload = {
      id: user.id,
      type: 'refresh'
    };
    
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  }

  static extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  static async blacklistToken(token) {
    // Implementation would depend on your caching strategy
    // For now, we'll just log it
    logger.info(`Token blacklisted: ${token.substring(0, 20)}...`);
  }
}