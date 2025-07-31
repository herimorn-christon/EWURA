import { dbManager } from '../database/DatabaseManager.js';
import { RedisManager } from '../cache/RedisManager.js';
import { ATGService } from '../services/ATGService.js';
import { SocketService } from '../services/SocketService.js';
import { ApiResponse } from '../views/ApiResponse.js';

export const healthCheck = async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {}
    };

    // Check Database
    try {
      const dbInfo = await dbManager.getConnectionInfo();
      health.services.database = {
        status: 'healthy',
        connections: dbInfo
      };
    } catch (error) {
      health.services.database = {
        status: 'unhealthy',
        error: error.message
      };
      health.status = 'degraded';
    }

    // Check Redis
    health.services.redis = {
      status: RedisManager.isConnected ? 'healthy' : 'degraded',
      usingInMemoryCache: RedisManager.useInMemoryCache
    };

    // Check ATG Service
    const atgStatus = ATGService.getStatus();
    health.services.atg = {
      status: atgStatus.isConnected ? 'healthy' : 'degraded',
      isMonitoring: atgStatus.isMonitoring,
      simulationMode: atgStatus.simulationMode
    };

    // Check WebSocket Service
    health.services.websocket = {
      status: 'healthy',
      connectedClients: SocketService.getClientCount()
    };

    // System metrics
    health.system = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      }
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
    
  } catch (error) {
    ApiResponse.error(res, 'Health check failed', 503, error.message);
  }
};