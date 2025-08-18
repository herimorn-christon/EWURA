import { taxpayerModel } from '../models/Taxpayer.js';
import { ApiResponse } from '../views/ApiResponse.js';
import { logger } from '../utils/logger.js';
import { dbManager } from '../database/DatabaseManager.js';

export class TaxpayerController {
  static async getAllTaxpayers(req, res, next) {
    try {
      const { isActive, businessType } = req.query;
      console.log('TaxpayerController.getAllTaxpayers - Query params:', req.query);
      const filters = {};
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (businessType) filters.businessType = businessType;
      
      const taxpayers = await taxpayerModel.getTaxpayersWithDetails(filters);
      
      ApiResponse.success(res, { taxpayers });
    } catch (error) {
      logger.error('Get all taxpayers error:', error);
      next(error);
    }
  }

  static async getTaxpayerById(req, res, next) {
    try {
      const { id } = req.params;
      
      // Get taxpayer with location details
      const query = `
        SELECT t.*, s.name as street_name, s.code as street_code,
               w.name as ward_name, w.code as ward_code,
               d.name as district_name, d.code as district_code,
               r.name as region_name, r.code as region_code,
               c.name as country_name, c.code as country_code
        FROM taxpayers t
        LEFT JOIN streets s ON t.street_id = s.id
        LEFT JOIN wards w ON s.ward_id = w.id
        LEFT JOIN districts d ON w.district_id = d.id
        LEFT JOIN regions r ON d.region_id = r.id
        LEFT JOIN countries c ON r.country_id = c.id
        WHERE t.id = $1
      `;
      
      const result = await dbManager.query(query, [id]);
      const taxpayer = result.rows[0];
      
      if (!taxpayer) {
        return ApiResponse.notFound(res, 'Taxpayer not found');
      }
      
      ApiResponse.success(res, { taxpayer });
    } catch (error) {
      logger.error('Get taxpayer by ID error:', error);
      next(error);
    }
  }

  static async createTaxpayer(req, res, next) {
    try {
      const { 
        tin, 
        vrn, 
        businessName, 
        tradeName, 
        businessType, 
        streetId,  // Changed from wardId to streetId
        address, 
        phone, 
        email, 
        registrationDate 
      } = req.body;
      
      // Check if TIN already exists
      const existingTaxpayer = await taxpayerModel.findByTin(tin);
      if (existingTaxpayer) {
        return ApiResponse.error(res, 'TIN already registered', 409);
      }
      
      // Check if VRN already exists (if provided)
      if (vrn) {
        const existingVrn = await taxpayerModel.findByVrn(vrn);
        if (existingVrn) {
          return ApiResponse.error(res, 'VRN already registered', 409);
        }
      }
      
      // Verify street exists
      if (streetId) {
        const streetExists = await dbManager.query('SELECT id FROM streets WHERE id = $1', [streetId]);
        if (streetExists.rows.length === 0) {
          return ApiResponse.error(res, 'Selected street does not exist', 400);
        }
      }
      
      const taxpayerData = {
        tin,
        vrn,
        business_name: businessName,
        trade_name: tradeName,
        business_type: businessType,
        street_id: streetId,  // Changed from ward_id to street_id
        address,
        phone,
        email,
        registration_date: registrationDate
      };
      
      const taxpayer = await taxpayerModel.create(taxpayerData);
      
      logger.info(`Taxpayer created: ${taxpayer.business_name} (TIN: ${taxpayer.tin})`);
      
      ApiResponse.created(res, { taxpayer }, 'Taxpayer created successfully');
    } catch (error) {
      logger.error('Create taxpayer error:', error);
      next(error);
    }
  }

  static async updateTaxpayer(req, res, next) {
    try {
      const { id } = req.params;
      const { 
        tin, 
        vrn, 
        businessName, 
        tradeName, 
        businessType, 
        streetId,  // Changed from wardId to streetId
        address, 
        phone, 
        email, 
        registrationDate,
        isActive 
      } = req.body;
      
      // Check for TIN conflicts (if updating TIN)
      if (tin) {
        const existingTin = await taxpayerModel.findByTin(tin);
        if (existingTin && existingTin.id !== id) {
          return ApiResponse.error(res, 'TIN already in use by another taxpayer', 409);
        }
      }
      
      // Check for VRN conflicts (if updating VRN)
      if (vrn) {
        const existingVrn = await taxpayerModel.findByVrn(vrn);
        if (existingVrn && existingVrn.id !== id) {
          return ApiResponse.error(res, 'VRN already in use by another taxpayer', 409);
        }
      }
      
      // Verify street exists (if updating street)
      if (streetId) {
        const streetExists = await dbManager.query('SELECT id FROM streets WHERE id = $1', [streetId]);
        if (streetExists.rows.length === 0) {
          return ApiResponse.error(res, 'Selected street does not exist', 400);
        }
      }
      
      const updateData = {};
      if (tin) updateData.tin = tin;
      if (vrn) updateData.vrn = vrn;
      if (businessName) updateData.business_name = businessName;
      if (tradeName) updateData.trade_name = tradeName;
      if (businessType) updateData.business_type = businessType;
      if (streetId) updateData.street_id = streetId;  // Changed from ward_id to street_id
      if (address) updateData.address = address;
      if (phone) updateData.phone = phone;
      if (email) updateData.email = email;
      if (registrationDate) updateData.registration_date = registrationDate;
      
      // Handle boolean fields explicitly
      if (isActive !== undefined && isActive !== null) {
        updateData.is_active = isActive;
      }
      
      // Debug logging
      logger.debug('TaxpayerController.updateTaxpayer - Request body:', req.body);
      logger.debug('TaxpayerController.updateTaxpayer - Update data:', updateData);
      
      const taxpayer = await taxpayerModel.update(id, updateData);
      if (!taxpayer) {
        return ApiResponse.notFound(res, 'Taxpayer not found');
      }
      
      logger.info(`Taxpayer updated: ${taxpayer.business_name} (TIN: ${taxpayer.tin})`);
      
      ApiResponse.updated(res, { taxpayer }, 'Taxpayer updated successfully');
    } catch (error) {
      logger.error('Update taxpayer error:', error);
      next(error);
    }
  }

  static async deleteTaxpayer(req, res, next) {
    try {
      const { id } = req.params;
      
      // Check if taxpayer has associated stations
      const stationsQuery = `
        SELECT COUNT(*) as station_count 
        FROM stations 
        WHERE taxpayer_id = $1
      `;
      const stationsResult = await dbManager.query(stationsQuery, [id]);
      const stationCount = parseInt(stationsResult.rows[0].station_count);
      
      if (stationCount > 0) {
        return ApiResponse.error(res, 
          `Cannot delete taxpayer. ${stationCount} station(s) are associated with this taxpayer. Please reassign or delete the stations first.`, 
          400
        );
      }
      
      const taxpayer = await taxpayerModel.delete(id);
      if (!taxpayer) {
        return ApiResponse.notFound(res, 'Taxpayer not found');
      }
      
      logger.info(`Taxpayer deleted: ${taxpayer.business_name} (TIN: ${taxpayer.tin})`);
      
      ApiResponse.deleted(res, 'Taxpayer deleted successfully');
    } catch (error) {
      logger.error('Delete taxpayer error:', error);
      next(error);
    }
  }

  static async searchTaxpayers(req, res, next) {
    try {
      const { query } = req.query;
      
      if (!query || query.length < 2) {
        return ApiResponse.error(res, 'Search query must be at least 2 characters long', 400);
      }
      
      const taxpayers = await taxpayerModel.searchTaxpayers(query);
      
      ApiResponse.success(res, taxpayers, 200, `Found ${taxpayers.length} taxpayers matching "${query}"`);
    } catch (error) {
      logger.error('Search taxpayers error:', error);
      next(error);
    }
  }

  static async lookupByTin(req, res, next) {
    try {
      const { tin } = req.params;
      
      const taxpayer = await taxpayerModel.findByTin(tin);
      
      if (!taxpayer) {
        return ApiResponse.notFound(res, 'Taxpayer not found with this TIN');
      }
      
      ApiResponse.success(res, { taxpayer });
    } catch (error) {
      logger.error('Lookup taxpayer by TIN error:', error);
      next(error);
    }
  }

  static async lookupByVrn(req, res, next) {
    try {
      const { vrn } = req.params;
      
      const taxpayer = await taxpayerModel.findByVrn(vrn);
      
      if (!taxpayer) {
        return ApiResponse.notFound(res, 'Taxpayer not found with this VRN');
      }
      
      ApiResponse.success(res, { taxpayer });
    } catch (error) {
      logger.error('Lookup taxpayer by VRN error:', error);
      next(error);
    }
  }

  static async getTaxpayerStations(req, res, next) {
    try {
      const { id } = req.params;
      
      const stations = await taxpayerModel.getTaxpayerStations(id);
      
      ApiResponse.success(res, { stations });
    } catch (error) {
      logger.error('Get taxpayer stations error:', error);
      next(error);
    }
  }

  static async getBusinessTypes(req, res, next) {
    try {
      const businessTypes = await taxpayerModel.getBusinessTypes();
      
      ApiResponse.success(res, { businessTypes });
    } catch (error) {
      logger.error('Get business types error:', error);
      next(error);
    }
  }
}