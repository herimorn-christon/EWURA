import { stationModel } from '../models/Station.js';
import { ApiResponse } from '../views/ApiResponse.js';
import { logger } from '../utils/logger.js';

export class StationController {
  static async getAllStations(req, res, next) {
    try {
      const { isActive, regionId } = req.query;
      
      const filters = {};
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (regionId) filters.regionId = regionId;
      
      const stations = await stationModel.getStationsWithDetails(filters);
      
      ApiResponse.success(res, { stations });
    } catch (error) {
      logger.error('Get all stations error:', error);
      next(error);
    }
  }

  static async getStationById(req, res, next) {
    try {
      const { id } = req.params;
      const station = await stationModel.findById(id);
      
      if (!station) {
        return ApiResponse.notFound(res, 'Station not found');
      }
      
      ApiResponse.success(res, { station });
    } catch (error) {
      logger.error('Get station by ID error:', error);
      next(error);
    }
  }

  static async createStation(req, res, next) {
    try {
      const { 
        code, 
        name, 
        taxpayerId, 
        streetId, 
        address, 
        ewuraLicenseNo, 
        operationalHours, 
        coordinates,
        interfaceTypeId 
      } = req.body;
      
      // Validate required fields
      if (!interfaceTypeId) {
        return ApiResponse.badRequest(res, 'Interface type is required');
      }
      
      if (!code || !name || !taxpayerId) {
        return ApiResponse.badRequest(res, 'Code, name and taxpayer ID are required');
      }

      // Map camelCase to snake_case for database
      const stationData = {
        code,
        name,
        taxpayer_id: taxpayerId,
        street_id: streetId,
        address,
        ewura_license_no: ewuraLicenseNo,
        operational_hours: operationalHours,
        coordinates,
        interface_type_id: interfaceTypeId
      };
      
      const station = await stationModel.create(stationData);
      
      logger.info(`Station created: ${station.name}`);
      ApiResponse.created(res, { station });
    } catch (error) {
      logger.error('Create station error:', error);
      next(error);
    }
  }

  static async updateStation(req, res, next) {
    try {
      const { id } = req.params;
      const { 
        code, 
        name, 
        taxpayerId, 
        streetId, 
        address, 
        ewuraLicenseNo, 
        operationalHours, 
        coordinates,
        interfaceTypeId,
        isActive 
      } = req.body;
      
      // Check if station exists before update
      const existingStation = await stationModel.findById(id);
      if (!existingStation) {
        return ApiResponse.notFound(res, 'Station not found');
      }

      // Stricter interface type validation
      if (!interfaceTypeId && !existingStation.interface_type_id) {
        return ApiResponse.badRequest(res, 'Interface type is required');
      }

      // Prevent setting interface type to null/empty
      if (interfaceTypeId === null || interfaceTypeId === '') {
        return ApiResponse.badRequest(res, 'Interface type cannot be empty or null');
      }
      
      // Map camelCase to snake_case for database
      const updateData = {};
      if (code) updateData.code = code;
      if (name) updateData.name = name;
      if (taxpayerId) updateData.taxpayer_id = taxpayerId;
      if (streetId) updateData.street_id = streetId;
      if (address) updateData.address = address;
      if (ewuraLicenseNo) updateData.ewura_license_no = ewuraLicenseNo;
      if (operationalHours) updateData.operational_hours = operationalHours;
      if (coordinates) updateData.coordinates = coordinates;
      if (interfaceTypeId) {
        // Additional validation to ensure interfaceTypeId is a valid UUID
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(interfaceTypeId)) {
          return ApiResponse.badRequest(res, 'Invalid interface type ID format');
        }
        updateData.interface_type_id = interfaceTypeId;
      }
      if (isActive !== undefined) updateData.is_active = isActive;

      // Add validation at database level
      const station = await stationModel.update(id, {
        ...updateData,
        interface_type_id: interfaceTypeId || existingStation.interface_type_id
      });
      
      logger.info(`Station updated: ${station.name}`);
      ApiResponse.updated(res, { station });
    } catch (error) {
      logger.error('Update station error:', error);
      next(error);
    }
  }

  static async deleteStation(req, res, next) {
    try {
      const { id } = req.params;
      
      const station = await stationModel.delete(id);
      if (!station) {
        return ApiResponse.notFound(res, 'Station not found');
      }
      
      logger.info(`Station deleted: ${station.name}`);
      ApiResponse.deleted(res);
    } catch (error) {
      logger.error('Delete station error:', error);
      next(error);
    }
  }

  static async getStationSummary(req, res, next) {
    try {
      const { id } = req.params;
      const summary = await stationModel.getStationSummary(id);
      
      if (!summary) {
        return ApiResponse.notFound(res, 'Station not found');
      }
      
      ApiResponse.success(res, { summary });
    } catch (error) {
      logger.error('Get station summary error:', error);
      next(error);
    }
  }

  static async getAccessibleStations(req, res, next) {
    try {
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin' || req.user.role_code === 'ADMIN';
      console.log('User ID:', userId, 'Is Admin:', isAdmin);

      // Accept same filters as getAllStations
      const { isActive, regionId, includeInactive } = req.query;
      const filters = {};
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (regionId) filters.regionId = regionId;

      let stations = [];

      if (isAdmin) {
        // Admin: reuse the general model method and allow an "includeInactive" override
        if (includeInactive === 'true') {
          // remove isActive filter so model returns both active & inactive
          delete filters.isActive;
        }
        stations = await stationModel.getStationsWithDetails(filters);
        console.log('Admin stations (model) returned:', stations.length, stations.map(s => s.id));

        // Fallback only if model returned unexpectedly few results
        if (!stations || stations.length < 1) {
          const { DatabaseManager } = await import('../database/DatabaseManager.js');
          const result = await DatabaseManager.query(`
            SELECT s.id, s.name, s.code, s.is_active,
                   it.code AS interface_code, it.name AS interface_type_name
            FROM stations s
            LEFT JOIN interface_types it ON s.interface_type_id = it.id
            ORDER BY s.name
          `, []);
          stations = result.rows;
          console.log('Fallback DB query returned:', stations.length, stations.map(s => s.id));
        }
      } else {
        // Regular users: only stations assigned to the user
        stations = await stationModel.getAccessibleStations(userId);
        console.log('Accessible stations for user returned:', stations.length, stations.map(s => s.id));
      }

      ApiResponse.success(res, { 
        stations: stations.map(station => ({
          id: station.id,
          name: station.name,
          code: station.code,
          interface_code: station.interface_code,
          interface_name: station.interface_name || station.interface_type_name,
          is_active: station.is_active
        }))
      });
    } catch (error) {
      logger.error('Get accessible stations error:', error);
      next(error);
    }
  }
}