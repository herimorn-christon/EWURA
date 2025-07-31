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
      if (interfaceTypeId) updateData.interface_type_id = interfaceTypeId;
      if (isActive !== undefined) updateData.is_active = isActive;
      
      const station = await stationModel.update(id, updateData);
      if (!station) {
        return ApiResponse.notFound(res, 'Station not found');
      }
      
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
}