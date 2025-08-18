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
    this.simulationMode = process.env.NODE_ENV !== 'production';
    // Add flags to control different simulation aspects
    this.simulateTanks = false; // disabled by default
    this.monitoringInterval = null;
    this.hourlyStorageInterval = null;
  }

  async initialize() {
    try {
      if (this.simulationMode) {
        logger.info(`[${this.interfaceCode}] Initialized in simulation mode`);
        await this.startSimulation();
        return;
      }

      await this.connect();
      logger.info(`[${this.interfaceCode}] Initialized successfully`);
    } catch (error) {
      logger.warn(`[${this.interfaceCode}] Hardware not available, running in simulation mode`);
      this.simulationMode = true;
      await this.startSimulation();
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
      tanks.forEach(tank => {
        if (tank.status === 'online') {
          this.latestTankData.set(tank.tankNumber, tank);
        }
      });

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
    if (this.simulationMode && !this.isMonitoring) {
      this.isMonitoring = true;
      logger.info(`[${this.interfaceCode}] Starting simulation mode...`);

      // inject 5 transactions ONCE at simulation start
      try {
        const txs = this._generateSimulatedTransactions(5, null);
        await this.receiveTransactionData({ transactions: txs });
        logger.info(`[${this.interfaceCode}] Injected ${txs.length} simulated transactions on start`);
      } catch (err) {
        logger.error(`[${this.interfaceCode}] Failed to inject simulated transactions on start:`, err);
      }

      // Only start tank simulation if enabled
      if (this.simulateTanks) {
        // Real-time simulation - tank data only
        this.monitoringInterval = setInterval(async () => {
          const simulatedData = this.generateSimulatedTankData();
          simulatedData.forEach(tank => {
            this.latestTankData.set(tank.tankNumber, tank);
          });
          this.emitRealTimeData('tankData', { tanks: simulatedData });
        }, this.commandInterval);
        
        // Hourly storage - tank data only
        this.hourlyStorageInterval = setInterval(() => {
          this.storeLatestReadings();
        }, this.storageInterval);
        
        // Store initial reading
        setTimeout(() => {
          this.storeLatestReadings();
        }, 5000);
      }
    }
  }

  generateSimulatedTankData() {
    const tanks = [];
    const baseTime = new Date();
    
    for (let i = 1; i <= 3; i++) {
      const tankNumber = i.toString().padStart(2, '0');
      const baseVolume = 5000 + (i * 1000);
      const variation = (Math.random() - 0.5) * 100;
      
      tanks.push({
        timestamp: baseTime.toISOString().replace('T', ' ').slice(0, 19),
        tankNumber,
        tank_number: tankNumber,
        totalVolume: Math.round((baseVolume + variation) * 10) / 10,
        total_volume: Math.round((baseVolume + variation) * 10) / 10,
        tcVolume: Math.round((baseVolume + variation - 50) * 10) / 10,
        tc_volume: Math.round((baseVolume + variation - 50) * 10) / 10,
        ullage: Math.round((10000 - baseVolume - variation) * 10) / 10,
        oilHeight: Math.round((1200 + Math.random() * 100) * 10) / 10,
        oil_height: Math.round((1200 + Math.random() * 100) * 10) / 10,
        waterHeight: Math.round((Math.random() * 20) * 10) / 10,
        water_height: Math.round((Math.random() * 20) * 10) / 10,
        temperature: Math.round((25 + Math.random() * 10) * 10) / 10,
        waterVolume: Math.round((Math.random() * 50) * 10) / 10,
        water_volume: Math.round((Math.random() * 50) * 10) / 10,
        oilVolume: Math.round((baseVolume + variation - Math.random() * 50) * 10) / 10,
        oil_volume: Math.round((baseVolume + variation - Math.random() * 50) * 10) / 10,
        status: 'online'
      });
    }
    
    return tanks;
  }

  async startMonitoring() {
    if (this.isMonitoring) return;

    logger.info(`[${this.interfaceCode}] Starting monitoring...`);

    if (this.simulationMode) {
      await this.startSimulation();
    } else {
      this.isMonitoring = true;
      
      // Real-time monitoring
      this.monitoringInterval = setInterval(async () => {
        await this.sendCommand();
      }, this.commandInterval);
      
      // Hourly storage
      this.hourlyStorageInterval = setInterval(() => {
        this.storeLatestReadings();
      }, this.storageInterval);
    }
  }

  /**
   * Receive transaction data from external systems (NPGIS interface)
   * For NPGIS, transactions come from external modules via API
   */

  
  async receiveTransactionData(transactionData, station = null, providedApiKey = null) {
    try {
      logger.info(`[${this.interfaceCode}] Processing transaction data for station ${station?.code || 'UNKNOWN'}`);

      const apiKey = providedApiKey || null;
      const globalKey = process.env.API_KEY || null;

      // If no station passed, resolve one:
      if (!station) {
        // 1) try to find station by provided api key
        if (apiKey) {
          const byKey = await DatabaseManager.query('SELECT * FROM stations WHERE api_key = $1 AND is_active = true LIMIT 1', [apiKey]);
          if (byKey?.rows?.[0]) {
            station = byKey.rows[0];
            logger.info(`[${this.interfaceCode}] Resolved station by api_key: ${station.code}`);
          }
        }

        // 2) fallback to first active station
        if (!station) {
          const r2 = await DatabaseManager.query('SELECT * FROM stations WHERE is_active = true ORDER BY created_at LIMIT 1', []);
          if (r2?.rows?.[0]) {
            station = r2.rows[0];
            logger.info(`[${this.interfaceCode}] Using first active station: ${station.code}`);
          }
        }
      }

      if (!station) {
        logger.warn(`[${this.interfaceCode}] No station could be resolved for incoming transaction`);
        return { count: 0 };
      }

      // Only use provided transactions, don't auto-generate
      let txs = Array.isArray(transactionData?.transactions) ? transactionData.transactions : [];
      
      if (!txs || txs.length === 0) {
        logger.info(`[${this.interfaceCode}] No transactions to process`);
        return { count: 0 };
      }

      // Format transactions
      const formattedTransactions = txs.map(tx => ({
        station_id: station.id,
        transaction_id: tx.Transaction || tx.transaction_id || `SIM-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        pump_id: null,
        volume: parseFloat(tx.Volume || tx.volume || 0),
        unit_price: parseFloat(tx.Price || tx.price || 0),
        total_amount: parseFloat(tx.Amount || tx.amount || 0),
        transaction_date: tx.transaction_date || new Date().toISOString().split('T')[0],
        transaction_time: tx.transaction_time || new Date().toTimeString().split(' ')[0],
        interface_source: this.simulationMode ? 'NPGIS_SIM' : this.interfaceCode,
        customer_name: tx.CustomerName || tx.customer_name || null,
        fuel_grade_name: tx.FuelGradeName || tx.fuel_grade_name || null,
        efd_serial_number: tx.EfdSerialNumber || tx.efd_serial_number || null,
        tc_volume: parseFloat(tx.TCVolume || tx.tc_volume || 0),
        discount_amount: parseFloat(tx.DiscountAmount || tx.discount_amount || 0)
      }));

      // Save transactions
      for (const tx of formattedTransactions) {
        try {
          const savedId = await this.saveTransaction(tx, station.id);
          logger.info(`[${this.interfaceCode}] Saved transaction ${tx.transaction_id} with id=${savedId}`);
        } catch (err) {
          logger.error(`[${this.interfaceCode}] Failed to save transaction ${tx.transaction_id}:`, err);
        }
      }

      // Emit real-time data
      this.emitRealTimeData('transactions', {
        station: { id: station.id, code: station.code },
        transactions: formattedTransactions,
        count: formattedTransactions.length
      });

      return { count: formattedTransactions.length };
    } catch (error) {
      logger.error(`[${this.interfaceCode}] Transaction processing error:`, error);
      throw error;
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
      logger.info(`[${this.interfaceCode}] Storing latest tank readings...`);
      
      if (this.latestTankData.size === 0) {
        logger.warn(`[${this.interfaceCode}] No tank data available for storage`);
        return;
      }

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