import { SerialPort } from 'serialport';
import { DelimiterParser } from '@serialport/parser-delimiter';
import { BaseInterfaceService } from './BaseInterfaceService.js';
import { logger } from '../utils/logger.js';
import { DatabaseManager } from '../database/DatabaseManager.js';

/**
 * NPGIS (ATG) Interface Service
 * Handles communication with ATG devices for tank monitoring
 */
class ATGDelimiterParser extends DelimiterParser {
  constructor() {
    super({ delimiter: Buffer.from('&&'), includeDelimiter: true });
  }
}

export class NPGISService extends BaseInterfaceService {
  constructor(stationId = null) {
    super('NPGIS', stationId);
    this.simulationMode = false; // Disable transaction simulation
    this.simulateTanks = true; // Enable tank simulation
    this.monitoringInterval = null;
    this.hourlyStorageInterval = null;
  }

  async initialize() {
    try {
      if (!this.simulationMode) {
        logger.info(`[${this.interfaceCode}] Transaction simulation is disabled. Real transaction data will be processed.`);
      }

      await this.connect();
      logger.info(`[${this.interfaceCode}] Initialized successfully`);
    } catch (error) {
      logger.error(`[${this.interfaceCode}] Initialization failed:`, error);
      throw error;
    }
  }

  async connect() {
    if (this.isConnected || this.simulationMode) return;

    try {
      logger.info(`[${this.interfaceCode}] Opening serial port: ${this.serialConfig.path}`);
      
      this.port = new SerialPort({
        ...this.serialConfig,
        autoOpen: false
      });

      this.port.on('error', this.handleError.bind(this));
      this.port.on('close', this.handleClose.bind(this));

      await new Promise((resolve, reject) => {
        this.port.open((err) => {
          if (err) {
            logger.error(`[${this.interfaceCode}] Failed to open serial port:`, err);
            reject(err);
            return;
          }

          this.parser = this.port.pipe(new ATGDelimiterParser());
          this.parser.on('data', (data) => {
            try {
              const parsedData = this.parseATGResponse(data);
              if (parsedData) {
                this.handleData(parsedData);
              }
            } catch (error) {
              logger.error(`[${this.interfaceCode}] Error handling response:`, error);
            }
          });
          
          this.isConnected = true;
          resolve();
        });
      });

      logger.info(`[${this.interfaceCode}] Serial connection established`);
    } catch (error) {
      logger.error(`[${this.interfaceCode}] Connection failed:`, error);
      throw error;
    }
  }

  handleError(error) {
    logger.error(`[${this.interfaceCode}] Serial port error:`, error);
    this.isConnected = false;
  }

  handleClose() {
    logger.warn(`[${this.interfaceCode}] Serial connection closed`);
    this.isConnected = false;
  }

  async handleData(dataPart) {
    try {
      logger.debug(`[${this.interfaceCode}] Processing ATG data...`);
      const tanks = await this.processTankData(dataPart);

      // Store latest data for each tank
      let newDataAdded = false;
      tanks.forEach(tank => {
        if (tank.status === 'online') {
          this.latestTankData.set(tank.tankNumber, tank);
          newDataAdded = true;
        }
      });

      // Restart hourly storage if new data is added
      if (newDataAdded && !this.hourlyStorageInterval) {
        logger.info(`[${this.interfaceCode}] New tank data received. Restarting storage interval.`);
        this.startHourlyStorage();
      }

      // Emit real-time data
      this.emitRealTimeData('tankData', { tanks });

      logger.debug(`[${this.interfaceCode}] Processed ${tanks.filter(t => t.status === 'online').length} online tanks`);
    } catch (error) {
      logger.error(`[${this.interfaceCode}] Error handling ATG data:`, error);
    }
  }

  parseATGResponse(response) {
    try {
      const cleanedResponse = response.toString().replace(/[^\x20-\x7E]/g, '');
      const [dataPart] = cleanedResponse.split('&&');
      
      if (dataPart && dataPart.includes('i201')) {
        return dataPart;
      }
      return null;
    } catch (error) {
      logger.error(`[${this.interfaceCode}] Error parsing ATG response:`, error);
      return null;
    }
  }

  async processTankData(data) {
    const tanks = [];
    
    try {
      // Process each tank (1-5)
      for (let tankNum = 1; tankNum <= 5; tankNum++) {
        const searchKey = `${tankNum.toString().padStart(2, '0')}0000007`;
        const matchIndex = data.indexOf(searchKey);
        
        if (matchIndex === -1) {
          tanks.push({
            tankNumber: tankNum.toString().padStart(2, '0'),
            tank_number: tankNum.toString().padStart(2, '0'),
            status: 'offline'
          });
          continue;
        }

        // Extract and parse tank data
        const first16Chars = data.substring(0, 16);
        const startIndex = matchIndex + searchKey.length - 1;
        const next56Chars = data.substring(startIndex, startIndex + 56);
        const last6Chars = data.slice(-7, -1);
        const resultString = first16Chars + searchKey.substring(0, 8) + next56Chars + last6Chars;
        
        const tankNumber = resultString.substring(16, 18);
        const numFieldsHex = resultString.substring(23, 25);
        const numFields = parseInt(numFieldsHex, 16);
        
        // Parse float values
        const floatValues = [];
        let index = 25;
        for (let i = 0; i < numFields; i++) {
          const hexValue = resultString.substring(index, index + 8);
          const value = hexValue.length === 8 ? this.ieee754HexToFloat(hexValue) : null;
          floatValues.push(value);
          index += 8;
        }

        // Create tank object
        const tank = {
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          tankNumber,
          tank_number: tankNumber,
          totalVolume: Math.round((floatValues[0] || 0) * 10) / 10,
          total_volume: Math.round((floatValues[0] || 0) * 10) / 10,
          tcVolume: Math.round((floatValues[1] || 0) * 10) / 10,
          tc_volume: Math.round((floatValues[1] || 0) * 10) / 10,
          ullage: Math.round((floatValues[2] || 0) * 10) / 10,
          oilHeight: Math.round((floatValues[3] || 0) * 10) / 10,
          oil_height: Math.round((floatValues[3] || 0) * 10) / 10,
          waterHeight: Math.round((floatValues[4] || 0) * 10) / 10,
          water_height: Math.round((floatValues[4] || 0) * 10) / 10,
          temperature: Math.round((floatValues[5] || 0) * 10) / 10,
          waterVolume: Math.round((floatValues[6] || 0) * 10) / 10,
          water_volume: Math.round((floatValues[6] || 0) * 10) / 10,
          oilVolume: Math.round((floatValues[0] - (floatValues[6] || 0)) * 10) / 10,
          oil_volume: Math.round((floatValues[0] - (floatValues[6] || 0)) * 10) / 10,
          status: 'online'
        };

        tanks.push(tank);
      }
      
      return tanks;
    } catch (error) {
      logger.error(`[${this.interfaceCode}] Error processing tank data:`, error);
      return tanks;
    }
  }

  ieee754HexToFloat(hexStr) {
    if (hexStr.length !== 8) return null;
    
    if (this.ieee754Cache.has(hexStr)) {
      return this.ieee754Cache.get(hexStr);
    }
    
    try {
      const buffer = Buffer.from(hexStr, 'hex');
      const value = buffer.readFloatBE(0);
      
      if (this.ieee754Cache.size >= this.maxCacheSize) {
        const firstKey = this.ieee754Cache.keys().next().value;
        this.ieee754Cache.delete(firstKey);
      }
      
      this.ieee754Cache.set(hexStr, value);
      return value;
    } catch (error) {
      return null;
    }
  }

  async startSimulation() {
    logger.warn(`[${this.interfaceCode}] Simulation mode is disabled. Skipping simulation.`);
  }

  async startMonitoring() {
    if (this.isMonitoring) return;

    logger.info(`[${this.interfaceCode}] Starting monitoring...`);

    if (this.simulateTanks) {
      logger.info(`[${this.interfaceCode}] Tank simulation is enabled.`);
      this.startTankSimulation();
    }

    this.isMonitoring = true;

    // Real-time monitoring for tanks
    this.monitoringInterval = setInterval(async () => {
      await this.sendCommand();
    }, this.commandInterval);

    // Hourly storage for tanks
    this.startHourlyStorage();
  }

  startHourlyStorage() {
    if (this.hourlyStorageInterval) {
      clearInterval(this.hourlyStorageInterval);
    }

    this.hourlyStorageInterval = setInterval(() => {
      if (this.latestTankData.size > 0) {
        this.storeLatestReadings();
      } else {
        logger.warn(`[${this.interfaceCode}] No tank data available. Stopping storage interval.`);
        clearInterval(this.hourlyStorageInterval); // Stop the interval when no data is available
        this.hourlyStorageInterval = null;
      }
    }, this.storageInterval);
  }

  async startTankSimulation() {
    logger.info(`[${this.interfaceCode}] Starting tank simulation...`);
    // Add logic for simulating tank data here
  }

  /**
   * Receive transaction data from external systems (NPGIS interface)
   * For NPGIS, transactions come from external modules via API
   */

  
  async receiveTransactionData(transactionData, station = null, providedApiKey = null) {
    console.log('the receivedTransactionData:', transactionData);
    console.log('Received API Key:', providedApiKey); // Log the API key

    try {
      logger.info(`[${this.interfaceCode}] Processing transaction data...`);

      if (!providedApiKey) {
        const response = {
          status: false,
          message: "The header information was missing Api-Key",
          data: null
        };
        console.log('Response to module:', response);
        return response;
      }

      // Resolve station directly using the API Key
      const stationQuery = await DatabaseManager.query(`
        SELECT s.*, i.code as interface_code
        FROM stations s
        LEFT JOIN interface_types i ON s.interface_type_id = i.id
        WHERE s.api_key = $1 AND s.is_active = true
        LIMIT 1
      `, [providedApiKey]);

      if (!stationQuery?.rows?.[0]) {
        const response = {
          status: false,
          message: "License number is not recognized or API key mismatch.",
          data: null
        };
        console.log('Response to module:', response);
        return response;
      }

      station = stationQuery.rows[0];
      logger.info(`[${this.interfaceCode}] Resolved station: ${station.code}`);

      // Validate EwuraLicenseNo
      if (!transactionData.EwuraLicenseNo || !/^PRL-\d{4}-\d{3}$/.test(transactionData.EwuraLicenseNo)) {
        const response = {
          status: false,
          message: "Valid EwuraLicenseNo is required eg: PRL-2022-208",
          data: null
        };
        console.log('Response to module:', response);
        return response;
      }

      // Process transactions
      const txs = Array.isArray(transactionData?.transactions) ? transactionData.transactions : [];
      if (!txs || txs.length === 0) {
        const response = {
          status: false,
          message: "No transactions to process",
          data: null
        };
        console.log('Response to module:', response);
        return response;
      }

      const transactionIds = [];
      const errors = [];

      // Save transactions
      for (const tx of txs) {
        try {
          // Check if the transaction already exists
          const existingTransaction = await DatabaseManager.query(`
            SELECT id FROM sales_transactions
            WHERE transaction_id = $1 AND station_id = $2
          `, [tx.Transaction, station.id]);

          if (existingTransaction?.rows?.length > 0) {
            const errorMessage = `Transaction ${tx.Transaction} already exists.`;
            logger.warn(`[${this.interfaceCode}] ${errorMessage}`);
            errors.push(errorMessage);
            continue;
          }

          // Validate EFD serial number
          if (!tx.EfdSerialNumber) {
            const errorMessage = `EFD serial number: ${tx.EfdSerialNumber || 'undefined'} is not recognized`;
            logger.warn(`[${this.interfaceCode}] ${errorMessage}`);
            errors.push(errorMessage);
            continue;
          }

          // Validate FuelGradeName
          if (!['DIESEL', 'KEROSENE', 'UNLEADED'].includes(tx.FuelGradeName)) {
            const errorMessage = `Tank with product name ${tx.FuelGradeName} does not exist`;
            logger.warn(`[${this.interfaceCode}] ${errorMessage}`);
            errors.push(errorMessage);
            continue;
          }

          // Save the transaction
          const savedId = await this.saveTransaction(tx, station.id);
          logger.info(`[${this.interfaceCode}] Saved transaction ${tx.Transaction} with id=${savedId}`);
          transactionIds.push(tx.Transaction);
        } catch (err) {
          const errorMessage = `Failed to save transaction ${tx.Transaction}: ${err.message}`;
          logger.error(`[${this.interfaceCode}] ${errorMessage}`);
          errors.push(errorMessage);
        }
      }

      // Return success response
      if (transactionIds.length > 0) {
        const response = {
          status: true,
          message: "Transactions received",
          data: {
            transactionIds
          }
        };
        console.log('Response to module:', response);
        return response;
      }

      // Return error response if no transactions were accepted
      const response = {
        status: false,
        message: "No valid transactions to process",
        data: null
      };
      console.log('Response to module:', response);
      return response;
    } catch (error) {
      logger.error(`[${this.interfaceCode}] Transaction processing error:`, error);
      const response = {
        status: false,
        message: "An unexpected error occurred while processing transactions",
        data: null
      };
      console.log('Response to module:', response);
      return response;
    }
  }



  


  
  _generateSimulatedTransactions(count = 5) {
    const now = new Date();
    return Array.from({ length: count }).map((_, i) => ({
      Transaction: `SIM-${now.getTime()}-${i}`,
      Volume: (Math.random() * 30 + 1).toFixed(3),
      Price: (Math.random() * 0.8 + 0.8).toFixed(2),
      Amount: ((Math.random() * 30 + 1) * (Math.random() * 0.8 + 0.8)).toFixed(2),
      transaction_date: now.toISOString().split('T')[0],
      transaction_time: now.toTimeString().split(' ')[0],
      FuelGradeName: ['Diesel','Petrol','Kerosene'][Math.floor(Math.random()*3)],
      CustomerName: `Sim Customer ${Math.floor(Math.random()*1000)}`,
      EfdSerialNumber: `EFD-SIM-${Math.floor(Math.random()*9999)}`,
      interface_source: 'NPGIS_SIM'
    }));
  }

  async clearSimulatedTransactions(stationId = null) {
    try {
      const sql = stationId
        ? 'DELETE FROM sales_transactions WHERE interface_source = $1 AND station_id = $2'
        : 'DELETE FROM sales_transactions WHERE interface_source = $1';
      const params = stationId ? ['NPGIS_SIM', stationId] : ['NPGIS_SIM'];
      
      const result = await DatabaseManager.query(sql, params);
      logger.info(`[${this.interfaceCode}] Cleared ${result.rowCount} simulated transactions`);
      return { deleted: result.rowCount };
    } catch (err) {
      logger.error(`[${this.interfaceCode}] Failed to clear simulated transactions:`, err);
      throw err;
    }
  }

  async stopMonitoring() {
    logger.info(`[${this.interfaceCode}] Stopping monitoring...`);
    
    // Clear all intervals
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (this.hourlyStorageInterval) {
      clearInterval(this.hourlyStorageInterval);
      this.hourlyStorageInterval = null;
    }

    this.isMonitoring = false;
    this.simulateTanks = false; // Reset flag
    
    // Clear stored tank data
    this.latestTankData.clear();
  }

  async sendCommand() {
    if (!this.isConnected) return;

    try {
      const command = Buffer.from("\x01i20100", 'ascii');
      return new Promise((resolve, reject) => {
        this.port.write(command, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    } catch (error) {
      logger.error(`[${this.interfaceCode}] Error sending command:`, error);
      throw error;
    }
  }

  async storeLatestReadings() {
    try {
      if (this.latestTankData.size === 0) {
        logger.warn(`[${this.interfaceCode}] No tank data available for storage. Skipping storage process.`);
        return; // Skip storage if no tank data is available
      }

      logger.info(`[${this.interfaceCode}] Storing latest tank readings...`);

      for (const [tankNumber, tankData] of this.latestTankData) {
        if (tankData.status === 'online') {
          await this.saveTankReading(tankData, this.stationId);
        }
      }

      this.lastStoredTime = new Date();
      logger.info(`[${this.interfaceCode}] Storage completed at: ${this.lastStoredTime.toISOString()}`);
    } catch (error) {
      logger.error(`[${this.interfaceCode}] Error in storage:`, error);
    }
  }

  async stop() {
    logger.info(`[${this.interfaceCode}] Stopping service...`);
    
    await this.stopMonitoring();
    
    if (this.port && this.isConnected) {
      this.port.close();
      this.isConnected = false;
    }
    
    logger.info(`[${this.interfaceCode}] Service stopped`);
  }
}

export const npgisService = new NPGISService();