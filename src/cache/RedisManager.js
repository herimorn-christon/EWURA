import { createClient } from 'redis';
import { logger } from '../utils/logger.js';
import { redisConfig } from '../config/database.js';

class RedisManagerClass {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async initialize() {
    try {
      // Check if Redis is available
      if (process.env.REDIS_DISABLED === 'true' || !process.env.REDIS_HOST) {
        logger.info('✅ Redis disabled, using in-memory cache');
        this.useInMemoryCache = true;
        this.cache = new Map();
        return;
      }

      this.client = createClient(redisConfig);

      this.client.on('error', (err) => {
        logger.warn('⚠️ Redis Client Error, falling back to in-memory cache:', err.message);
        this.isConnected = false;
        this.useInMemoryCache = true;
        this.cache = new Map();
      });

      this.client.on('connect', () => {
        logger.info('🔗 Redis Client connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        logger.info('✅ Redis Client ready');
      });

      this.client.on('end', () => {
        logger.warn('🔌 Redis Client connection ended');
        this.isConnected = false;
      });

      await this.client.connect();
      
    } catch (error) {
      logger.warn('⚠️ Redis not available, using in-memory cache');
      this.useInMemoryCache = true;
      this.cache = new Map();
    }
  }

  async get(key) {
    try {
      if (this.useInMemoryCache) {
        const item = this.cache.get(key);
        if (item && item.expiry > Date.now()) {
          return JSON.parse(item.value);
        } else if (item) {
          this.cache.delete(key);
        }
        return null;
      }

      if (!this.isConnected) return null;
      
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  async set(key, value, expireInSeconds = 3600) {
    try {
      if (this.useInMemoryCache) {
        this.cache.set(key, {
          value: JSON.stringify(value),
          expiry: Date.now() + (expireInSeconds * 1000)
        });
        
        // Clean up expired items occasionally
        if (this.cache.size > 1000) {
          this.cleanupExpiredItems();
        }
        return true;
      }

      if (!this.isConnected) return false;
      
      await this.client.setEx(key, expireInSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Redis set error:', error);
      return false;
    }
  }

  async del(key) {
    try {
      if (this.useInMemoryCache) {
        return this.cache.delete(key);
      }

      if (!this.isConnected) return false;
      
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis del error:', error);
      return false;
    }
  }

  async exists(key) {
    try {
      if (this.useInMemoryCache) {
        const item = this.cache.get(key);
        if (item && item.expiry > Date.now()) {
          return true;
        } else if (item) {
          this.cache.delete(key);
        }
        return false;
      }

      if (!this.isConnected) return false;
      
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis exists error:', error);
      return false;
    }
  }

  cleanupExpiredItems() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expiry <= now) {
        this.cache.delete(key);
      }
    }
  }

  async close() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('✅ Redis connection closed');
    }
  }
}

export const RedisManager = new RedisManagerClass();