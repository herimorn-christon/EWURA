import { countryModel, regionModel, districtModel, wardModel, streetModel } from '../models/Location.js';
import { ApiResponse } from '../views/ApiResponse.js';
import { logger } from '../utils/logger.js';
import { validateCreateStreet } from '../middleware/validation.js';

export class LocationController {
  // ==================== COUNTRIES ====================
  
  static async getAllCountries(req, res, next) {
    try {
      const countries = await countryModel.getAll();
      ApiResponse.success(res, { countries });
    } catch (error) {
      logger.error('Get all countries error:', error);
      next(error);
    }
  }

  static async getCountryById(req, res, next) {
    try {
      const { id } = req.params;
      const country = await countryModel.findById(id);
      
      if (!country) {
        return ApiResponse.notFound(res, 'Country not found');
      }
      
      ApiResponse.success(res, { country });
    } catch (error) {
      logger.error('Get country by ID error:', error);
      next(error);
    }
  }

  static async createCountry(req, res, next) {
    try {
      const { code, name } = req.body;
      
      // Check if country code already exists
      const existingCountry = await countryModel.findByCode(code);
      if (existingCountry) {
        return ApiResponse.error(res, 'Country code already exists', 409);
      }
      
      const country = await countryModel.create({ code, name });
      
      logger.info(`Country created: ${country.name} (${country.code})`);
      ApiResponse.created(res, { country }, 'Country created successfully');
    } catch (error) {
      logger.error('Create country error:', error);
      next(error);
    }
  }

  static async updateCountry(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // If updating code, check for duplicates
      if (updateData.code) {
        const existingCountry = await countryModel.findByCode(updateData.code);
        if (existingCountry && existingCountry.id !== id) {
          return ApiResponse.error(res, 'Country code already exists', 409);
        }
      }
      
      const country = await countryModel.update(id, updateData);
      if (!country) {
        return ApiResponse.notFound(res, 'Country not found');
      }
      
      logger.info(`Country updated: ${country.name}`);
      ApiResponse.updated(res, { country }, 'Country updated successfully');
    } catch (error) {
      logger.error('Update country error:', error);
      next(error);
    }
  }

  static async deleteCountry(req, res, next) {
    try {
      const { id } = req.params;
      
      const country = await countryModel.delete(id);
      if (!country) {
        return ApiResponse.notFound(res, 'Country not found');
      }
      
      logger.info(`Country deleted: ${country.name}`);
      ApiResponse.deleted(res, 'Country deleted successfully');
    } catch (error) {
      logger.error('Delete country error:', error);
      next(error);
    }
  }

  // ==================== REGIONS ====================
  
  static async getAllRegions(req, res, next) {
    try {
      const { countryId } = req.query;
      
      let regions;
      if (countryId) {
        regions = await regionModel.getRegionsByCountry(countryId);
      } else {
        regions = await regionModel.getRegionsWithDetails();
      }
      
      ApiResponse.success(res, { regions });
    } catch (error) {
      logger.error('Get all regions error:', error);
      next(error);
    }
  }

  static async getRegionById(req, res, next) {
    try {
      const { id } = req.params;
      const region = await regionModel.findById(id);
      
      if (!region) {
        return ApiResponse.notFound(res, 'Region not found');
      }
      
      ApiResponse.success(res, { region });
    } catch (error) {
      logger.error('Get region by ID error:', error);
      next(error);
    }
  }

  static async createRegion(req, res, next) {
    try {
      const { code, name, countryId } = req.body;
      
      // Check if region code already exists
      const existingRegion = await regionModel.findByCode(code);
      if (existingRegion) {
        return ApiResponse.error(res, 'Region code already exists', 409);
      }
      
      // Verify country exists
      const country = await countryModel.findById(countryId);
      if (!country) {
        return ApiResponse.error(res, 'Country not found', 400);
      }
      
      const region = await regionModel.create({
        code,
        name,
        country_id: countryId
      });
      
      logger.info(`Region created: ${region.name} (${region.code})`);
      ApiResponse.created(res, { region }, 'Region created successfully');
    } catch (error) {
      logger.error('Create region error:', error);
      next(error);
    }
  }

  static async updateRegion(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // If updating code, check for duplicates
      if (updateData.code) {
        const existingRegion = await regionModel.findByCode(updateData.code);
        if (existingRegion && existingRegion.id !== id) {
          return ApiResponse.error(res, 'Region code already exists', 409);
        }
      }
      
      // If updating country, verify it exists
      if (updateData.countryId) {
        const country = await countryModel.findById(updateData.countryId);
        if (!country) {
          return ApiResponse.error(res, 'Country not found', 400);
        }
        updateData.country_id = updateData.countryId;
        delete updateData.countryId;
      }
      
      const region = await regionModel.update(id, updateData);
      if (!region) {
        return ApiResponse.notFound(res, 'Region not found');
      }
      
      logger.info(`Region updated: ${region.name}`);
      ApiResponse.updated(res, { region }, 'Region updated successfully');
    } catch (error) {
      logger.error('Update region error:', error);
      next(error);
    }
  }

  static async deleteRegion(req, res, next) {
    try {
      const { id } = req.params;
      
      const region = await regionModel.delete(id);
      if (!region) {
        return ApiResponse.notFound(res, 'Region not found');
      }
      
      logger.info(`Region deleted: ${region.name}`);
      ApiResponse.deleted(res, 'Region deleted successfully');
    } catch (error) {
      logger.error('Delete region error:', error);
      next(error);
    }
  }

  // ==================== DISTRICTS ====================
  
  static async getAllDistricts(req, res, next) {
    try {
      const { regionId } = req.query;
      
      let districts;
      if (regionId) {
        districts = await districtModel.getDistrictsByRegion(regionId);
      } else {
        districts = await districtModel.getDistrictsWithDetails();
      }
      
      ApiResponse.success(res, { districts });
    } catch (error) {
      logger.error('Get all districts error:', error);
      next(error);
    }
  }

  static async getDistrictById(req, res, next) {
    try {
      const { id } = req.params;
      const district = await districtModel.findById(id);
      
      if (!district) {
        return ApiResponse.notFound(res, 'District not found');
      }
      
      ApiResponse.success(res, { district });
    } catch (error) {
      logger.error('Get district by ID error:', error);
      next(error);
    }
  }

  static async createDistrict(req, res, next) {
    try {
      const { code, name, regionId } = req.body;
      
      // Check if district code already exists
      const existingDistrict = await districtModel.findByCode(code);
      if (existingDistrict) {
        return ApiResponse.error(res, 'District code already exists', 409);
      }
      
      // Verify region exists
      const region = await regionModel.findById(regionId);
      if (!region) {
        return ApiResponse.error(res, 'Region not found', 400);
      }
      
      const district = await districtModel.create({
        code,
        name,
        region_id: regionId
      });
      
      logger.info(`District created: ${district.name} (${district.code})`);
      ApiResponse.created(res, { district }, 'District created successfully');
    } catch (error) {
      logger.error('Create district error:', error);
      next(error);
    }
  }

  static async updateDistrict(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // If updating code, check for duplicates
      if (updateData.code) {
        const existingDistrict = await districtModel.findByCode(updateData.code);
        if (existingDistrict && existingDistrict.id !== id) {
          return ApiResponse.error(res, 'District code already exists', 409);
        }
      }
      
      // If updating region, verify it exists
      if (updateData.regionId) {
        const region = await regionModel.findById(updateData.regionId);
        if (!region) {
          return ApiResponse.error(res, 'Region not found', 400);
        }
        updateData.region_id = updateData.regionId;
        delete updateData.regionId;
      }
      
      const district = await districtModel.update(id, updateData);
      if (!district) {
        return ApiResponse.notFound(res, 'District not found');
      }
      
      logger.info(`District updated: ${district.name}`);
      ApiResponse.updated(res, { district }, 'District updated successfully');
    } catch (error) {
      logger.error('Update district error:', error);
      next(error);
    }
  }

  static async deleteDistrict(req, res, next) {
    try {
      const { id } = req.params;
      
      const district = await districtModel.delete(id);
      if (!district) {
        return ApiResponse.notFound(res, 'District not found');
      }
      
      logger.info(`District deleted: ${district.name}`);
      ApiResponse.deleted(res, 'District deleted successfully');
    } catch (error) {
      logger.error('Delete district error:', error);
      next(error);
    }
  }

  // ==================== WARDS ====================
  
  static async getAllWards(req, res, next) {
    try {
      const { districtId } = req.query;
      
      let wards;
      if (districtId) {
        wards = await wardModel.getWardsByDistrict(districtId);
      } else {
        wards = await wardModel.getWardsWithDetails();
      }
      
      ApiResponse.success(res, { wards });
    } catch (error) {
      logger.error('Get all wards error:', error);
      next(error);
    }
  }

  static async getWardById(req, res, next) {
    try {
      const { id } = req.params;
      const ward = await wardModel.findById(id);
      
      if (!ward) {
        return ApiResponse.notFound(res, 'Ward not found');
      }
      
      ApiResponse.success(res, { ward });
    } catch (error) {
      logger.error('Get ward by ID error:', error);
      next(error);
    }
  }

  static async createWard(req, res, next) {
    try {
      const { code, name, districtId } = req.body;
      
      // Check if ward code already exists
      const existingWard = await wardModel.findByCode(code);
      if (existingWard) {
        return ApiResponse.error(res, 'Ward code already exists', 409);
      }
      
      // Verify district exists
      const district = await districtModel.findById(districtId);
      if (!district) {
        return ApiResponse.error(res, 'District not found', 400);
      }
      
      const ward = await wardModel.create({
        code,
        name,
        district_id: districtId
      });
      
      logger.info(`Ward created: ${ward.name} (${ward.code})`);
      ApiResponse.created(res, { ward }, 'Ward created successfully');
    } catch (error) {
      logger.error('Create ward error:', error);
      next(error);
    }
  }

  static async updateWard(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // If updating code, check for duplicates
      if (updateData.code) {
        const existingWard = await wardModel.findByCode(updateData.code);
        if (existingWard && existingWard.id !== id) {
          return ApiResponse.error(res, 'Ward code already exists', 409);
        }
      }
      
      // If updating district, verify it exists
      if (updateData.districtId) {
        const district = await districtModel.findById(updateData.districtId);
        if (!district) {
          return ApiResponse.error(res, 'District not found', 400);
        }
        updateData.district_id = updateData.districtId;
        delete updateData.districtId;
      }
      
      const ward = await wardModel.update(id, updateData);
      if (!ward) {
        return ApiResponse.notFound(res, 'Ward not found');
      }
      
      logger.info(`Ward updated: ${ward.name}`);
      ApiResponse.updated(res, { ward }, 'Ward updated successfully');
    } catch (error) {
      logger.error('Update ward error:', error);
      next(error);
    }
  }

  static async deleteWard(req, res, next) {
    try {
      const { id } = req.params;
      
      const ward = await wardModel.delete(id);
      if (!ward) {
        return ApiResponse.notFound(res, 'Ward not found');
      }
      
      logger.info(`Ward deleted: ${ward.name}`);
      ApiResponse.deleted(res, 'Ward deleted successfully');
    } catch (error) {
      logger.error('Delete ward error:', error);
      next(error);
    }
  }

  // ==================== STREETS ====================
  
  static async getAllStreets(req, res, next) {
    try {
      const { wardId } = req.query;
      
      let streets;
      if (wardId) {
        streets = await streetModel.getStreetsByWard(wardId);
      } else {
        streets = await streetModel.getStreetsWithDetails();
      }
      
      ApiResponse.success(res, { streets });
    } catch (error) {
      logger.error('Get all streets error:', error);
      next(error);
    }
  }

  static async getStreetById(req, res, next) {
    try {
      const { id } = req.params;
      const street = await streetModel.findById(id);
      
      if (!street) {
        return ApiResponse.notFound(res, 'Street not found');
      }
      
      ApiResponse.success(res, { street });
    } catch (error) {
      logger.error('Get street by ID error:', error);
      next(error);
    }
  }

  static async createStreet(req, res, next) {
    try {
      const { code, name, wardId } = req.body;
      
      // Check if street code already exists
      const existingStreet = await streetModel.findByCode(code);
      if (existingStreet) {
        return ApiResponse.error(res, 'Street code already exists', 409);
      }
      
      // Verify ward exists
      const ward = await wardModel.findById(wardId);
      if (!ward) {
        return ApiResponse.error(res, 'Ward not found', 400);
      }
      
      const street = await streetModel.create({
        code,
        name,
        ward_id: wardId
      });
      
      logger.info(`Street created: ${street.name} (${street.code})`);
      ApiResponse.created(res, { street }, 'Street created successfully');
    } catch (error) {
      logger.error('Create street error:', error);
      next(error);
    }
  }

  static async updateStreet(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // If updating code, check for duplicates
      if (updateData.code) {
        const existingStreet = await streetModel.findByCode(updateData.code);
        if (existingStreet && existingStreet.id !== id) {
          return ApiResponse.error(res, 'Street code already exists', 409);
        }
      }
      
      // If updating ward, verify it exists
      if (updateData.wardId) {
        const ward = await wardModel.findById(updateData.wardId);
        if (!ward) {
          return ApiResponse.error(res, 'Ward not found', 400);
        }
        updateData.ward_id = updateData.wardId;
        delete updateData.wardId;
      }
      
      const street = await streetModel.update(id, updateData);
      if (!street) {
        return ApiResponse.notFound(res, 'Street not found');
      }
      
      logger.info(`Street updated: ${street.name}`);
      ApiResponse.updated(res, { street }, 'Street updated successfully');
    } catch (error) {
      logger.error('Update street error:', error);
      next(error);
    }
  }

  static async deleteStreet(req, res, next) {
    try {
      const { id } = req.params;
      
      const street = await streetModel.delete(id);
      if (!street) {
        return ApiResponse.notFound(res, 'Street not found');
      }
      
      logger.info(`Street deleted: ${street.name}`);
      ApiResponse.deleted(res, 'Street deleted successfully');
    } catch (error) {
      logger.error('Delete street error:', error);
      next(error);
    }
  }
}