import { EWURAService } from '../services/EWURAService.js';
import { stationModel } from '../models/Station.js';
import { ApiResponse } from '../views/ApiResponse.js';
import { logger } from '../utils/logger.js';
import { dbManager } from '../database/DatabaseManager.js';

export class EWURAController {
  static async registerStation(req, res, next) {
    try {
      const stationData = req.body;
      const station = await stationModel.findById(stationData.stationId);
      if (!station) {
        return ApiResponse.error(res, 'Station not found', 404);
      }
      const ewuraResult = await EWURAService.registerStation(stationData);
      logger.info(`EWURA station registration: ${station.name}`);
      return ApiResponse.success(res, {
        result: ewuraResult,
        message: 'Station registered with EWURA successfully'
      });
    } catch (error) {
      logger.error('EWURA station registration error:', error);
      next(error);
    }
  }

  static async submitTransaction(req, res, next) {
    try {
      const transactionData = req.body;
      const ewuraResult = await EWURAService.submitTransaction(transactionData);
      logger.info(`EWURA transaction submitted: ${transactionData.tranId}`);
      return ApiResponse.success(res, {
        result: ewuraResult,
        message: 'Transaction submitted to EWURA successfully'
      });
    } catch (error) {
      logger.error('EWURA transaction submission error:', error);
      next(error);
    }
  }

  static async submitDailySummary(req, res, next) {
    try {
      const { stationId, date } = req.body;
      const ewuraResult = await EWURAService.generateAndSubmitDailySummary(stationId, date);
      logger.info(`EWURA daily summary submitted: ${stationId} - ${date}`);
      return ApiResponse.success(res, {
        result: ewuraResult,
        message: 'Daily summary submitted to EWURA successfully'
      });
    } catch (error) {
      logger.error('EWURA daily summary submission error:', error);
      next(error);
    }
  }

  static async getSubmissionHistory(req, res, next) {
    try {
      const { stationId, type, startDate, endDate } = req.query;
      const history = await EWURAService.getSubmissionHistory({
        stationId,
        type,
        startDate,
        endDate
      });
      return ApiResponse.success(res, { history });
    } catch (error) {
      logger.error('Get EWURA submission history error:', error);
      next(error);
    }
  }

  static async validateCertificate(req, res, next) {
    try {
      const isValid = await EWURAService.validateCertificate();
      return ApiResponse.success(res, {
        isValid,
        message: isValid ? 'Certificate is valid' : 'Certificate validation failed'
      });
    } catch (error) {
      logger.error('EWURA certificate validation error:', error);
      next(error);
    }
  }

  static async getEWURARegistrationData(req, res, next) {
    try {
      const { managerId } = req.params;
      const query = `
        SELECT 
          u.id as manager_id,
          u.first_name,
          u.last_name,
          u.phone as manager_phone,
          u.email as manager_email,
          u.device_serial,
          s.id as station_id,
          s.code as station_code,
          s.name as station_name,
          s.address as station_address,
          s.ewura_license_no,
          t.tin as operator_tin,
          t.vrn as operator_vrn,
          t.business_name as operator_name,
          t.trade_name,
          st.name as street_name,
          w.name as ward_name,
          d.name as district_name,
          r.name as region_name,
          c.name as country_name,
          it.code as interface_code,
          it.name as interface_name
        FROM users u
        LEFT JOIN user_roles ur ON u.user_role_id = ur.id
        LEFT JOIN stations s ON u.station_id = s.id
        LEFT JOIN taxpayers t ON s.taxpayer_id = t.id
        LEFT JOIN streets st ON s.street_id = st.id
        LEFT JOIN wards w ON st.ward_id = w.id
        LEFT JOIN districts d ON w.district_id = d.id
        LEFT JOIN regions r ON d.region_id = r.id
        LEFT JOIN countries c ON r.country_id = c.id
        LEFT JOIN interface_types it ON s.interface_type_id = it.id
        WHERE u.id = $1 AND ur.code IN ('MANAGER', 'ADMIN')
      `;
      const dbResult = await dbManager.query(query, [managerId]);
      if (dbResult.rows.length === 0) {
        return ApiResponse.notFound(res, 'Manager not found or not authorized');
      }
      const data = dbResult.rows[0];
      const getZone = (regionName) => {
        const zones = {
          'Dar es Salaam': 'EAST',
          'Pwani': 'EAST',
          'Morogoro': 'EAST',
          'Lindi': 'SOUTH',
          'Mtwara': 'SOUTH',
          'Ruvuma': 'SOUTH',
          'Arusha': 'NORTH',
          'Kilimanjaro': 'NORTH',
          'Manyara': 'NORTH',
          'Dodoma': 'CENTRAL',
          'Singida': 'CENTRAL',
          'Tabora': 'CENTRAL'
        };
        return zones[regionName] || 'CENTRAL';
      };
      const apiSourceId = data.operator_tin ? `${data.operator_tin}_SPAdv2023T` : '';
      const licenseeTraSerialNo = data.operator_tin ? `10TZ${data.operator_tin.slice(-6)}` : '';
      const ewuraData = {
        autoFilled: {
          contactPersonEmailAddress: data.manager_email,
          contactPersonPhone: data.manager_phone?.replace(/^\+/, '') || '',
          efdSerialNumber: data.device_serial,
          retailStationName: data.station_name,
          ewuraLicenseNo: data.ewura_license_no,
          stationAddress: data.station_address,
          operatorTin: data.operator_tin,
          operatorVrn: data.operator_vrn,
          operatorName: data.operator_name,
          streetName: data.street_name,
          regionName: data.region_name,
          districtName: data.district_name,
          wardName: data.ward_name,
          zone: getZone(data.region_name),
          apiSourceId: apiSourceId,
          licenseeTraSerialNo: licenseeTraSerialNo
        },
        manualFields: {
          tranId: '',
          brandName: '',
          stationLocation: data.station_address || '',
          receiptCode: ''
        },
        completeData: {
          tranId: '',
          apiSourceId: apiSourceId,
          retailStationName: data.station_name,
          ewuraLicenseNo: data.ewura_license_no,
          operatorTin: data.operator_tin,
          operatorVrn: data.operator_vrn,
          operatorName: data.operator_name,
          licenseeTraSerialNo: licenseeTraSerialNo,
          streetName: data.street_name,
          regionName: data.region_name,
          districtName: data.district_name,
          wardName: data.ward_name,
          zone: getZone(data.region_name),
          contactPersonEmailAddress: data.manager_email,
          contactPersonPhone: data.manager_phone?.replace(/^\+/, '') || '',
          efdSerialNumber: data.device_serial,
          stationAddress: data.station_address
        },
        context: {
          managerId: data.manager_id,
          managerName: `${data.first_name} ${data.last_name}`,
          stationId: data.station_id,
          stationCode: data.station_code,
          deviceSerial: data.device_serial
        }
      };
      logger.info(`EWURA registration data retrieved for manager: ${data.first_name} ${data.last_name}`);
      return ApiResponse.success(res, {
        ewuraData,
        message: 'EWURA registration data retrieved successfully'
      });
    } catch (error) {
      logger.error('Get EWURA registration data error:', error);
      next(error);
    }
  }

  static async submitEWURARegistrationWithManager(req, res, next) {
    try {
      const { managerId } = req.params;
      const { tranId, brandName, stationLocation, receiptCode } = req.body;
      const query = `
        SELECT 
          u.id as manager_id,
          u.first_name,
          u.last_name,
          u.phone as manager_phone,
          u.email as manager_email,
          u.device_serial,
          s.id as station_id,
          s.code as station_code,
          s.name as station_name,
          s.address as station_address,
          s.ewura_license_no,
          t.tin as operator_tin,
          t.vrn as operator_vrn,
          t.business_name as operator_name,
          t.trade_name,
          st.name as street_name,
          w.name as ward_name,
          d.name as district_name,
          r.name as region_name,
          c.name as country_name
        FROM users u
        LEFT JOIN user_roles ur ON u.user_role_id = ur.id
        LEFT JOIN stations s ON u.station_id = s.id
        LEFT JOIN taxpayers t ON s.taxpayer_id = t.id
        LEFT JOIN streets st ON s.street_id = st.id
        LEFT JOIN wards w ON st.ward_id = w.id
        LEFT JOIN districts d ON w.district_id = d.id
        LEFT JOIN regions r ON d.region_id = r.id
        LEFT JOIN countries c ON r.country_id = c.id
        WHERE u.id = $1 AND ur.code IN ('MANAGER', 'ADMIN')
      `;
      const dbResult = await dbManager.query(query, [managerId]);
      if (dbResult.rows.length === 0) {
        return ApiResponse.notFound(res, 'Manager not found or not authorized');
      }
      const data = dbResult.rows[0];
      const getZone = (regionName) => {
        const zones = {
          'Dar es Salaam': 'EAST',
          'Pwani': 'EAST',
          'Morogoro': 'EAST',
          'Lindi': 'SOUTH',
          'Mtwara': 'SOUTH',
          'Ruvuma': 'SOUTH',
          'Arusha': 'NORTH',
          'Kilimanjaro': 'NORTH',
          'Manyara': 'NORTH',
          'Dodoma': 'CENTRAL',
          'Singida': 'CENTRAL',
          'Tabora': 'CENTRAL'
        };
        return zones[regionName] || 'CENTRAL';
      };
      const apiSourceId = data.operator_tin ? `${data.operator_tin}_SPAdv2023T` : '';
      const licenseeTraSerialNo = data.operator_tin ? `10TZ${data.operator_tin.slice(-6)}` : '';
      const completeRegistrationData = {
        tranId,
        apiSourceId: apiSourceId,
        retailStationName: data.station_name,
        ewuraLicenseNo: data.ewura_license_no,
        operatorTin: data.operator_tin,
        operatorVrn: data.operator_vrn,
        operatorName: data.operator_name,
        licenseeTraSerialNo: licenseeTraSerialNo,
        regionName: data.region_name,
        districtName: data.district_name,
        wardName: data.ward_name,
        zone: getZone(data.region_name),
        contactPersonEmailAddress: data.manager_email,
        contactPersonPhone: data.manager_phone?.replace(/^\+/, '') || '',
        stationId: data.station_id,
        brandName,
        stationLocation,
        receiptCode
      };
      const ewuraResult = await EWURAService.registerStation(completeRegistrationData);
      logger.info(`EWURA registration submitted for manager: ${managerId}`);
      return ApiResponse.success(res, {
        result: ewuraResult,
        submittedData: completeRegistrationData,
        message: 'EWURA registration submitted successfully'
      });
    } catch (error) {
      logger.error('Submit EWURA registration with manager error:', error);
      next(error);
    }
  }
}