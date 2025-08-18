import { npgisService } from './NPGISService.js';
import { nfppService } from './NFPPService.js';
import { DatabaseManager } from '../database/DatabaseManager.js';
import { logger } from '../utils/logger.js';

/**
 * Interface Manager
 * Manages multiple interface services and provides unified access
 */
export class InterfaceManager {
  constructor() {
    this.services = new Map();
    this.stationInterfaces = new Map();
    this.initialized = false;
  }

  async initialize() {
    try {
      logger.info('Initializing Interface Manager...');

      // Register interface services
      this.services.set('NPGIS', npgisService);
      this.services.set('NFPP', nfppService);

      // Load station interface mappings
      await this.loadStationInterfaces();


      this.initialized = true;
      logger.info('Interface Manager initialized successfully');
    } catch (error) {
      logger.error('Interface Manager initialization failed:', error);
      throw error;
    }
  }

  async initializeServices() {
    // Initialize all services
    for (const [code, service] of this.services) {
      try {
        await service.initialize();
        logger.info(`${code} service initialized successfully`);
      } catch (error) {
        logger.warn(`${code} service initialization failed:`, error);
      }
    }
  }
  async loadStationInterfaces() {
    try {
      const result = await DatabaseManager.query(`
        SELECT s.id, s.code as station_code, it.code as interface_code
        FROM stations s
        JOIN interface_types it ON s.interface_type_id = it.id
        WHERE s.is_active = true
      `);

      this.stationInterfaces.clear();
      result.rows.forEach(row => {
        this.stationInterfaces.set(row.id, row.interface_code);
      });

      logger.info(`Loaded ${result.rows.length} station interface mappings`);
    } catch (error) {
      logger.error('Error loading station interfaces:', error);
      throw error;
    }
  }

  getServiceForStation(stationId) {
    const interfaceCode = this.stationInterfaces.get(stationId);
    if (!interfaceCode) {
      logger.warn(`No interface mapping found for station ${stationId}, using NPGIS`);
      return this.services.get('NPGIS');
    }

    const service = this.services.get(interfaceCode);
    if (!service) {
      logger.warn(`No service found for interface ${interfaceCode}, using NPGIS`);
      return this.services.get('NPGIS');
    }

    return service;
  }

  getServiceByCode(interfaceCode) {
    const normalizedCode = interfaceCode.toUpperCase();
    
    // Handle aliases
    switch (normalizedCode) {
      case 'ATG':
      case 'CONSOLE':
        return this.services.get('NPGIS');
      case 'PTS':
      case 'VFD':
        return this.services.get('NFPP');
      default:
        return this.services.get(normalizedCode);
    }
  }

  async startAllMonitoring() {
    try {
      logger.info('Starting monitoring for all interfaces...');
      
      for (const [code, service] of this.services) {
        try {
          await service.startMonitoring();
          logger.info(`${code} monitoring started`);
        } catch (error) {
          logger.warn(`Failed to start ${code} monitoring:`, error);
        }
      }
    } catch (error) {
      logger.error('Error starting all monitoring:', error);
      throw error;
    }
  }

  async stopAllMonitoring() {
    try {
      logger.info('Stopping monitoring for all interfaces...');
      
      for (const [code, service] of this.services) {
        try {
          await service.stopMonitoring();
          logger.info(`${code} monitoring stopped`);
        } catch (error) {
          logger.warn(`Failed to stop ${code} monitoring:`, error);
        }
      }
    } catch (error) {
      logger.error('Error stopping all monitoring:', error);
      throw error;
    }
  }

  getAllStatuses() {
    const statuses = {};
    for (const [code, service] of this.services) {
      statuses[code] = service.getStatus();
    }
    return statuses;
  }

  async refreshStationMappings() {
    await this.loadStationInterfaces();
  }
}

export const interfaceManager = new InterfaceManager();