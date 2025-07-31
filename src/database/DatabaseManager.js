import pkg from 'pg';
import { logger } from '../utils/logger.js';
import { databaseConfig } from '../config/database.js';
import { initializeSchema } from './schema.js';
import { seedDefaultData } from './seeds.js';

const { Pool } = pkg;

class DatabaseManagerClass {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  async initialize() {
    try {
      this.pool = new Pool(databaseConfig);
      
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      this.isConnected = true;
      logger.info('✅ Database connection pool created');

      // Initialize schema
      await initializeSchema(this.pool);
      logger.info('✅ Database schema initialized');

      // Seed default data
      await seedDefaultData(this.pool);
      logger.info('✅ Default data seeded');

      // Setup connection event handlers
      this.pool.on('error', (err) => {
        logger.error('❌ Unexpected error on idle client:', err);
        this.isConnected = false;
      });

      this.pool.on('connect', () => {
        logger.debug('🔗 New database client connected');
      });

      this.pool.on('remove', () => {
        logger.debug('🔌 Database client removed from pool');
      });

    } catch (error) {
      logger.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  async query(text, params = []) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Database query executed', {
        duration: `${duration}ms`,
        rows: result.rowCount,
        query: text.substring(0, 100) + (text.length > 100 ? '...' : '')
      });
      
      return result;
    } catch (error) {
      logger.error('Database query error:', {
        error: error.message,
        query: text,
        params
      });
      throw error;
    }
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getConnectionInfo() {
    if (!this.isConnected) return null;
    
    const result = await this.query(`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `);
    
    return {
      ...result.rows[0],
      pool_size: this.pool.totalCount,
      pool_idle: this.pool.idleCount,
      pool_waiting: this.pool.waitingCount
    };
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      logger.info('✅ Database connection pool closed');
    }
  }

  getPool() {
    return this.pool;
  }
}

// Singleton instance
export const dbManager = new DatabaseManagerClass();

// Export for backward compatibility
export const DatabaseManager = dbManager;