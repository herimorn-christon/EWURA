import { npgisService } from '../services/NPGISService.js';
import { nfppService } from '../services/NFPPService.js';
import { interfaceManager } from '../services/InterfaceManager.js';
import { DatabaseManager } from '../database/DatabaseManager.js';
import { ApiResponse } from '../views/ApiResponse.js';
import { logger } from '../utils/logger.js';

export class UnifiedInterfaceController {
  
  /**
   * Check user permissions for station access
   */
  static checkStationAccess(user, requestedStationId) {
    // Admin can access all stations
    // accept multiple shapes: role, role_code, or nested user_role.code
    if (user?.role === 'admin' || user?.role_code === 'ADMIN' || user?.user_role?.code === 'ADMIN') {
      return { canAccess: true, stationId: requestedStationId };
    }

    // Non-admin users can only access their assigned station
    if (user.station_id) {
      if (!requestedStationId || requestedStationId === user.station_id) {
        return { canAccess: true, stationId: user.station_id };
      } else {
        return { canAccess: false, error: 'Access denied to requested station' };
      }
    }

    return { canAccess: false, error: 'No station assigned to user' };
  }

  /**
   * Get current tank data from any interface (NPGIS or NFPP)
   * Unified endpoint that routes to appropriate interface service
   */
  static async getCurrentTankData(req, res, next) {
    try {
      const { stationId, interfaceCode } = req.query;
      const user = req.user;

      // Check station access permissions
      const accessCheck = UnifiedInterfaceController.checkStationAccess(user, stationId);
      if (!accessCheck.canAccess) {
        return ApiResponse.forbidden(res, accessCheck.error);
      }

      const effectiveStationId = accessCheck.stationId;
      
      // Get interface service based on station or interface code
      let service;
      if (interfaceCode) {
        service = interfaceManager.getServiceByCode(interfaceCode);
        if (!service) {
          return ApiResponse.badRequest(res, 'Invalid interface code');
        }
      } else if (effectiveStationId) {
        service = interfaceManager.getServiceForStation(effectiveStationId);
      } else {
        // Default to NPGIS for admin without station filter
        service = npgisService;
      }

      const tankData = await service.getCurrentTankData({
        stationId: effectiveStationId,
        interfaceCode: interfaceCode
      });

      ApiResponse.success(res, { 
        tanks: tankData,
        stationId: effectiveStationId,
        interfaceCode: service.interfaceCode,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Get current tank data error:', error);
      next(error);
    }
  }

  /**
   * Get transactions from any interface (NPGIS or NFPP)
   * Unified endpoint that routes to appropriate interface service
   */
  static async getTransactions(req, res, next) {
    try {
      const { stationId, interfaceCode, date, limit = 20 } = req.query;
      const user = req.user;

      // Check station access permissions
      const accessCheck = UnifiedInterfaceController.checkStationAccess(user, stationId);
      if (!accessCheck.canAccess) {
        return ApiResponse.forbidden(res, accessCheck.error);
      }

      const effectiveStationId = accessCheck.stationId;
      
      // Get transactions using base interface service method
      let service;
      if (interfaceCode) {
        service = interfaceManager.getServiceByCode(interfaceCode);
      } else if (effectiveStationId) {
        service = interfaceManager.getServiceForStation(effectiveStationId);
      } else {
        service = npgisService; // Default
      }

      const transactions = await service.getTransactions({
        stationId: effectiveStationId,
        interfaceCode: interfaceCode,
        date: date,
        limit: parseInt(limit)
      });

      ApiResponse.success(res, { 
        transactions,
        stationId: effectiveStationId,
        interfaceCode: service.interfaceCode,
        filters: { date, limit },
        count: transactions.length
      });
    } catch (error) {
      logger.error('Get transactions error:', error);
      next(error);
    }
  }

  /**
   * Receive transaction data from external systems
   * Uses API key to identify station and route to appropriate interface
   */
  static async receiveTransactionData(req, res, next) {
    try {
      const apiKey = req.headers['api-key'];
      
      if (!apiKey) {
        return ApiResponse.unauthorized(res, 'API key required');
      }

      // Validate API key and get station info
      const stationResult = await DatabaseManager.query(`
        SELECT s.id, s.code, s.ewura_license_no, s.api_key, s.is_active,
               it.code as interface_code
        FROM stations s
        JOIN interface_types it ON s.interface_type_id = it.id
        WHERE s.api_key = $1 AND s.is_active = true
      `, [apiKey]);

      if (stationResult.rows.length === 0) {
        return ApiResponse.forbidden(res, 'Invalid API key or inactive station');
      }

      const station = stationResult.rows[0];
      
      // Route to appropriate interface service
      const service = interfaceManager.getServiceByCode(station.interface_code);
      if (!service) {
        return ApiResponse.badRequest(res, `Interface ${station.interface_code} not supported`);
      }

      // Process transaction data
      const result = await service.receiveTransactionData(req.body, station);
      
      logger.info(`Transaction data received for station ${station.code} via ${station.interface_code}`);
      
      ApiResponse.success(res, {
        message: 'Transaction data received successfully',
        station: station.code,
        interface: station.interface_code,
        processed: result.count || 0
      });
    } catch (error) {
      logger.error('Receive transaction data error:', error);
      next(error);
    }
  }

  /**
   * Start monitoring for specific interface
   */
  static async startMonitoring(req, res, next) {
    try {
      const { stationId, interfaceCode } = req.body;
      const user = req.user;

      // Check station access permissions
      const accessCheck = UnifiedInterfaceController.checkStationAccess(user, stationId);
      if (!accessCheck.canAccess) {
        return ApiResponse.forbidden(res, accessCheck.error);
      }

      const service = interfaceCode ? 
        interfaceManager.getServiceByCode(interfaceCode) :
        interfaceManager.getServiceForStation(accessCheck.stationId);

      if (!service) {
        return ApiResponse.badRequest(res, 'Invalid interface or station');
      }

      await service.startMonitoring();
      
      logger.info(`Monitoring started for ${service.interfaceCode}`);
      
      ApiResponse.success(res, {
        message: `${service.interfaceCode} monitoring started`,
        status: service.getStatus()
      });
    } catch (error) {
      logger.error('Start monitoring error:', error);
      next(error);
    }
  }

  /**
   * Stop monitoring for specific interface
   */
  static async stopMonitoring(req, res, next) {
    try {
      const { stationId, interfaceCode } = req.body;
      const user = req.user;

      // Check station access permissions
      const accessCheck = UnifiedInterfaceController.checkStationAccess(user, stationId);
      if (!accessCheck.canAccess) {
        return ApiResponse.forbidden(res, accessCheck.error);
      }

      const service = interfaceCode ? 
        interfaceManager.getServiceByCode(interfaceCode) :
        interfaceManager.getServiceForStation(accessCheck.stationId);

      if (!service) {
        return ApiResponse.badRequest(res, 'Invalid interface or station');
      }

      await service.stopMonitoring();
      
      logger.info(`Monitoring stopped for ${service.interfaceCode}`);
      
      ApiResponse.success(res, {
        message: `${service.interfaceCode} monitoring stopped`,
        status: service.getStatus()
      });
    } catch (error) {
      logger.error('Stop monitoring error:', error);
      next(error);
    }
  }

  /**
   * Get interface status
   */
  static async getInterfaceStatus(req, res, next) {
    try {
      const { stationId, interfaceCode } = req.query;
      const user = req.user;

      // Check station access permissions if stationId provided
      if (stationId) {
        const accessCheck = UnifiedInterfaceController.checkStationAccess(user, stationId);
        if (!accessCheck.canAccess) {
          return ApiResponse.forbidden(res, accessCheck.error);
        }
      }

      let statuses;
      
      if (interfaceCode) {
        const service = interfaceManager.getServiceByCode(interfaceCode);
        if (!service) {
          return ApiResponse.badRequest(res, 'Invalid interface code');
        }
        statuses = { [service.interfaceCode]: service.getStatus() };
      } else {
        statuses = interfaceManager.getAllStatuses();
      }

      ApiResponse.success(res, { 
        statuses,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Get interface status error:', error);
      next(error);
    }
  }

  /**
   * Get stations accessible to current user
   */
  static async getAccessibleStations(req, res, next) {
    try {
      const user = req.user;
      
      let query = `
        SELECT s.id, s.code, s.name, s.ewura_license_no,
               it.code as interface_code, it.name as interface_name
        FROM stations s
        JOIN interface_types it ON s.interface_type_id = it.id
        WHERE s.is_active = true
      `;
      
      const params = [];
      
      // Non-admin users can only see their assigned station
      if (user.role !== 'admin' && user.user_role?.code !== 'ADMIN') {
        if (!user.station_id) {
          return ApiResponse.forbidden(res, 'No station assigned to user');
        }
        query += ` AND s.id = $1`;
        params.push(user.station_id);
      }
      
      query += ` ORDER BY s.name`;
      
      const result = await DatabaseManager.query(query, params);
      
      ApiResponse.success(res, { 
        stations: result.rows,
        userRole: user.role,
        canAccessAll: user.role === 'admin' || user.user_role?.code === 'ADMIN'
      });
    } catch (error) {
      logger.error('Get accessible stations error:', error);
      next(error);
    }
  }
}