import { SerialPort } from 'serialport';
import { DelimiterParser } from '@serialport/parser-delimiter';
import { logger } from '../utils/logger.js';
import { DatabaseManager } from '../database/DatabaseManager.js';
import { socketService } from './SocketService.js';

// ATG Delimiter Parser
class ATGDelimiterParser extends DelimiterParser {
  constructor() {
    super({ delimiter: Buffer.from('&&'), includeDelimiter: true });
  }
}

class ATGServiceClass {
  constructor() {
    this.serialConfig = {
      path: '/dev/ttyUSB0',
      baudRate: 9600,
      dataBits: 8,
      parity: 'none',
      stopBits: 1,
      timeout: 5000,
      autoOpen: false
    };
    
    this.isConnected = false;
    this.isMonitoring = false;
    this.port = null;
    this.parser = null;
    this.monitoringInterval = null;
    this.hourlyStorageInterval = null; // NEW: For hourly storage
    this.commandInterval = 5000; // 5 seconds for real-time updates
    this.storageInterval = 3600000; // 1 hour = 3600000ms
    this.maxRetries = 5;
    this.ieee754Cache = new Map();
    this.maxCacheSize = 1000;
    this.pendingRequests = new Map();
    this.requestId = 0;
    this.dataHandler = null;
    this.lastStoredTime = null; // Track last storage time
    this.latestTankData = new Map(); // Store latest data for each tank
  }

  async initialize() {
    try {
      // Check if running in simulation mode
      if (process.env.ATG_SIMULATION_MODE === 'true') {
        this.simulationMode = true;
        logger.info('✅ ATG Service initialized in simulation mode');
        await this.startSimulation();
        return;
      }

      await this.connect();
      logger.info('✅ ATG Service initialized');
    } catch (error) {
      logger.warn('⚠️ ATG hardware not available, running in simulation mode');
      this.simulationMode = true;
      await this.startSimulation();
    }
  }

  async connect() {
    if (this.isConnected || this.simulationMode) return;

    try {
      console.log('🔄 [ATGService] Opening serial port:', this.serialConfig.path);
      
      this.port = new SerialPort({
        ...this.serialConfig,
        autoOpen: false
      });

      this.port.on('error', this.handleError.bind(this));
      this.port.on('close', this.handleClose.bind(this));

      await new Promise((resolve, reject) => {
        this.port.open((err) => {
          if (err) {
            console.error('❌ [ATGService] Failed to open serial port:', err);
            reject(err);
            return;
          }

          console.log('✅ [ATGService] Serial port opened successfully');
          
          this.parser = this.port.pipe(new ATGDelimiterParser());
          
          this.parser.on('data', (data) => {
            try {
              console.log('⛽ [ATGService] Received raw data:', data.toString('hex'));
              const parsedData = this.parseATGResponse(data);
              if (parsedData) {
                this.handleData(parsedData);
              }
            } catch (error) {
              console.error('❌ [ATGService] Error handling response:', error);
            }
          });
          
          this.isConnected = true;
          
          // Store initial reading immediately upon connection
          this.storeInitialReading();
          
          resolve();
        });
      });

      logger.info('✅ ATG Serial connection established');
    } catch (error) {
      logger.error('❌ ATG connection failed:', error);
      throw error;
    }
  }

  handleError(error) {
    console.error('❌ [ATGService] Serial port error:', error);
    logger.error('ATG Serial error:', error);
    this.isConnected = false;
  }

  handleClose() {
    console.log('🔌 [ATGService] Serial port closed');
    logger.warn('ATG Serial connection closed');
    this.isConnected = false;
  }

  async handleData(dataPart) {
    try {
      console.log('⛽ [ATGService] Processing ATG data...');
      const tanks = await this.processTankData(dataPart);
      
      console.log('⛽ [ATGService] Processed tank data:');
      tanks.forEach(tank => {
        if (tank.status === 'online') {
          console.log(`📊 Tank ${tank.tankNumber}: ${tank.totalVolume}L, ${tank.temperature}°C, Status: ${tank.status}`);
          // Store latest data for each tank (for hourly storage)
          this.latestTankData.set(tank.tankNumber, tank);
        } else {
          console.log(`⚠️ Tank ${tank.tankNumber}: Status: ${tank.status}`);
        }
      });

      // Always emit real-time data to WebSocket clients
      console.log('📡 [ATGService] Emitting tank data to WebSocket clients...');
      socketService.emitToInterface({
        stationId: this.stationId || 'none',
        interfaceCode: 'CONSOLE', 
        event: 'tankData',
        payload: {
          tanks: tanks,
          stationId: this.stationId,
          timestamp: new Date().toISOString()
        }
      });
      console.log('✅ [ATGService] Tank data emitted to clients');
      
      logger.debug(`✅ Processed ${tanks.filter(t => t.status === 'online').length} online tanks`);
    } catch (error) {
      logger.error('❌ [ATGService] Error handling ATG data:', error);
      throw error;
    }
  }

  parseATGResponse(response) {
    try {
      console.log('🔍 [ATGService] Raw ATG response:', response.toString('hex'));
      
      // Convert response to string and clean non-printable characters
      const cleanedResponse = response.toString().replace(/[^\x20-\x7E]/g, '');
      console.log('🧹 [ATGService] Cleaned response:', cleanedResponse);
      
      // Split on && and take first part
      const [dataPart] = cleanedResponse.split('&&');
      console.log('📊 [ATGService] Data part:', dataPart);
      
      // Only return if it contains i201 marker
      if (dataPart && dataPart.includes('i201')) {
        console.log('✅ [ATGService] Valid ATG response format detected');
        return dataPart;
      } else {
        console.log('❌ [ATGService] Invalid ATG response format - missing i201 marker');
        return null;
      }
    } catch (error) {
      console.error('❌ [ATGService] Error parsing ATG response:', error);
      return null;
    }
  }

  async processTankData(data) {
    console.log('\n=== [ATGService] Processing Tank Data ===');
    console.log('📊 Raw data:', data);
    
    const tanks = [];
    
    try {
      // Process each tank
      for (let tankNum = 1; tankNum <= 5; tankNum++) {
        const searchKey = `${tankNum.toString().padStart(2, '0')}0000007`;
        const matchIndex = data.indexOf(searchKey);
        
        if (matchIndex === -1) {
          console.log(`⚠️ [ATGService] Tank ${tankNum} offline - search key not found`);
          tanks.push({
            tankNumber: tankNum.toString().padStart(2, '0'),
            tank_number: tankNum.toString().padStart(2, '0'),
            status: 'offline'
          });
          continue;
        }

        console.log(`✅ [ATGService] Tank ${tankNum} found at index: ${matchIndex}`);
        
        // Extract data parts
        const first16Chars = data.substring(0, 16);
        const startIndex = matchIndex + searchKey.length - 1;
        const next56Chars = data.substring(startIndex, startIndex + 56);
        const last6Chars = data.slice(-7, -1);
        
        const resultString = first16Chars + searchKey.substring(0, 8) + next56Chars + last6Chars;
        
        // Parse tank data
        const timestamp = resultString.substring(6, 16);
        const tankNumber = resultString.substring(16, 18);
        const numFieldsHex = resultString.substring(23, 25);
        const numFields = parseInt(numFieldsHex, 16);
        
        // Use CURRENT timestamp instead of ATG timestamp (which seems incorrect)
        const timestampFormatted = new Date().toISOString().replace('T', ' ').slice(0, 19);
        
        // Parse float values
        const floatValues = [];
        let index = 25;
        
        for (let i = 0; i < numFields; i++) {
          const hexValue = resultString.substring(index, index + 8);
          const value = hexValue.length === 8 ? this.ieee754HexToFloat(hexValue) : null;
          floatValues.push(value);
          index += 8;
        }
        
        // Create tank object with both naming conventions
        const tank = {
          timestamp: timestampFormatted, // Use current timestamp
          atg_timestamp: this.parseATGTimestamp(timestamp), // Keep ATG timestamp for reference
          tank_number: tankNumber, // Database format
          tankNumber, // Frontend format
          totalVolume: Math.round((floatValues[0] || 0) * 10) / 10,
          total_volume: Math.round((floatValues[0] || 0) * 10) / 10, // Database format
          tcVolume: Math.round((floatValues[1] || 0) * 10) / 10,
          tc_volume: Math.round((floatValues[1] || 0) * 10) / 10, // Database format
          ullage: Math.round((floatValues[2] || 0) * 10) / 10,
          oilHeight: Math.round((floatValues[3] || 0) * 10) / 10,
          oil_height: Math.round((floatValues[3] || 0) * 10) / 10, // Database format
          waterHeight: Math.round((floatValues[4] || 0) * 10) / 10,
          water_height: Math.round((floatValues[4] || 0) * 10) / 10, // Database format
          temperature: Math.round((floatValues[5] || 0) * 10) / 10,
          waterVolume: Math.round((floatValues[6] || 0) * 10) / 10,
          water_volume: Math.round((floatValues[6] || 0) * 10) / 10, // Database format
          oilVolume: Math.round((floatValues[0] - (floatValues[6] || 0)) * 10) / 10,
          oil_volume: Math.round((floatValues[0] - (floatValues[6] || 0)) * 10) / 10, // Database format
          status: 'online'
        };
        
        // Add detailed logging
        console.log('\n=== [ATGService] Tank Data Details ===');
        console.log(`🏷️ Tank Number: ${tank.tankNumber}`);
        console.log(`🕐 Current Timestamp: ${tank.timestamp}`);
        console.log(`🕐 ATG Timestamp: ${tank.atg_timestamp}`);
        console.log(`📊 Total Volume: ${tank.totalVolume} L`);
        console.log(`🛢️ TC Volume: ${tank.tcVolume} L`);
        console.log(`📏 Ullage: ${tank.ullage} L`);
        console.log(`📐 Oil Height: ${tank.oilHeight} mm`);
        console.log(`💧 Water Height: ${tank.waterHeight} mm`);
        console.log(`🌡️ Temperature: ${tank.temperature}°C`);
        console.log(`💧 Water Volume: ${tank.waterVolume} L`);
        console.log(`🛢️ Oil Volume: ${tank.oilVolume} L`);
        console.log(`✅ Status: ${tank.status}`);
        console.log('=====================================\n');

        tanks.push(tank);
      }
      
      return tanks;
      
    } catch (error) {
      console.error('❌ [ATGService] Error processing tank data:', error);
      return tanks;
    }
  }

  // Parse ATG timestamp for reference (but use current time for storage)
  parseATGTimestamp(timestamp) {
    try {
      console.log('🕐 [ATGService] Raw ATG timestamp input:', timestamp);
      
      if (timestamp.length >= 10) {
        // Try to extract meaningful components from ATG timestamp
        // But since it's unreliable, we'll just return it as reference
        return `ATG_RAW: ${timestamp}`;
      }
      
      return 'ATG_INVALID';
      
    } catch (error) {
      console.error('❌ [ATGService] Error parsing ATG timestamp:', error);
      return 'ATG_ERROR';
    }
  }

  ieee754HexToFloat(hexStr) {
    if (hexStr.length !== 8) return null;
    
    // Check cache first
    if (this.ieee754Cache.has(hexStr)) {
      return this.ieee754Cache.get(hexStr);
    }
    
    try {
      const buffer = Buffer.from(hexStr, 'hex');
      const value = buffer.readFloatBE(0);
      
      // Add to cache with size limit
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

  // NEW: Store initial reading immediately upon connection
  async storeInitialReading() {
    console.log('🔄 [ATGService] Storing initial reading upon connection...');
    this.lastStoredTime = new Date();
    
    // Send command to get initial data
    setTimeout(async () => {
      if (this.isConnected) {
        await this.sendCommand();
        // Wait a bit for response, then store
        setTimeout(() => {
          this.storeLatestReadings();
        }, 2000);
      }
    }, 1000);
  }

  // NEW: Store latest readings to database
  async storeLatestReadings() {
    try {
      console.log('\n=== [ATGService] HOURLY STORAGE ===');
      console.log('💾 [ATGService] Storing latest tank readings to database...');
      console.log('🕐 [ATGService] Storage time:', new Date().toISOString());
      
      if (this.latestTankData.size === 0) {
        console.log('⚠️ [ATGService] No tank data available for storage');
        return;
      }

      for (const [tankNumber, tankData] of this.latestTankData) {
        if (tankData.status === 'online') {
          console.log(`💾 [ATGService] Storing tank ${tankNumber} reading...`);
          await this.saveTankReading(tankData);
          console.log(`✅ [ATGService] Tank ${tankNumber} stored successfully`);
        }
      }

      this.lastStoredTime = new Date();
      console.log('✅ [ATGService] Hourly storage completed at:', this.lastStoredTime.toISOString());
      console.log('===============================\n');
      
    } catch (error) {
      console.error('❌ [ATGService] Error in hourly storage:', error);
      logger.error('Error in hourly storage:', error);
    }
  }

  async saveTankReading(tankData) {
    try {
      console.log(`\n=== [ATGService] Saving Tank Data to Database ===`);
      console.log('📊 Tank Data:', {
        tankNumber: tankData.tankNumber,
        timestamp: tankData.timestamp,
        totalVolume: tankData.totalVolume,
        oilVolume: tankData.oilVolume,
        waterVolume: tankData.waterVolume,
        tcVolume: tankData.tcVolume,
        ullage: tankData.ullage,
        oilHeight: tankData.oilHeight,
        waterHeight: tankData.waterHeight,
        temperature: tankData.temperature
      });

      // First find or create the tank
      let tankResult = await DatabaseManager.query(
        'SELECT id FROM tanks WHERE tank_number = $1',
        [tankData.tankNumber]
      );

      let tankId;
      if (tankResult.rows.length === 0) {
        console.log(`🔄 [ATGService] Tank ${tankData.tankNumber} not found, creating new tank...`);
        const createResult = await DatabaseManager.query(`
          INSERT INTO tanks (tank_number, capacity, is_active)
          VALUES ($1, 10000, true)
          RETURNING id
        `, [tankData.tankNumber]);
        tankId = createResult.rows[0].id;
        console.log(`✅ [ATGService] New tank created with ID: ${tankId}`);
      } else {
        tankId = tankResult.rows[0].id;
        console.log(`✅ [ATGService] Found existing tank with ID: ${tankId}`);
      }

      // Insert or update tank reading with UPSERT
      console.log(`💾 [ATGService] Upserting tank reading for tank ${tankData.tankNumber}...`);
      await DatabaseManager.query(`
        INSERT INTO tank_readings (
          tank_id, reading_timestamp, total_volume, oil_volume, water_volume,
          tc_volume, ullage, oil_height, water_height, temperature,
          reading_type, interface_source
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'REAL_TIME', 'CONSOLE')
        ON CONFLICT (tank_id, reading_timestamp)
        DO UPDATE SET
          total_volume = EXCLUDED.total_volume,
          oil_volume = EXCLUDED.oil_volume,
          water_volume = EXCLUDED.water_volume,
          tc_volume = EXCLUDED.tc_volume,
          ullage = EXCLUDED.ullage,
          oil_height = EXCLUDED.oil_height,
          water_height = EXCLUDED.water_height,
          temperature = EXCLUDED.temperature
      `, [
        tankId,
        tankData.timestamp,
        tankData.totalVolume,
        tankData.oilVolume,
        tankData.waterVolume,
        tankData.tcVolume,
        tankData.ullage,
        tankData.oilHeight,
        tankData.waterHeight,
        tankData.temperature
      ]);

      console.log(`✅ [ATGService] Tank reading upserted successfully for tank ${tankData.tankNumber}`);

      // Update tank current level
      console.log(`🔄 [ATGService] Updating tank ${tankData.tankNumber} current level...`);
      await DatabaseManager.query(`
        UPDATE tanks 
        SET current_level = $1, temperature = $2, last_reading_at = NOW()
        WHERE id = $3
      `, [tankData.totalVolume, tankData.temperature, tankId]);
      
      console.log(`✅ [ATGService] Tank ${tankData.tankNumber} current level updated to ${tankData.totalVolume}L`);

    } catch (error) {
      console.error(`❌ [ATGService] Error saving tank ${tankData.tankNumber}:`, error.message);
      logger.error('Error saving tank reading:', error);
      throw error;
    }
  }

  async startSimulation() {
    if (this.simulationMode && !this.isMonitoring) {
      this.isMonitoring = true;
      
      console.log('🔄 [ATGService] Starting ATG simulation mode...');
      
      // Real-time simulation (every 5 seconds)
      this.monitoringInterval = setInterval(async () => {
        console.log('⛽ [ATGService] Generating simulated tank data...');
        const simulatedData = this.generateSimulatedTankData();
        
        console.log('⛽ [ATGService] Simulated tank data generated:');
        simulatedData.forEach(tank => {
          console.log(`📊 Tank ${tank.tankNumber}: ${tank.totalVolume}L, ${tank.temperature}°C, Status: ${tank.status}`);
          // Store latest data for hourly storage
          this.latestTankData.set(tank.tankNumber, tank);
        });
        
        // Emit to connected clients using emitToInterface
        console.log('📡 [ATGService] Emitting simulated tank data to WebSocket clients...');
        socketService.emitToInterface({
          stationId: this.stationId || 'none',
          interfaceCode: 'CONSOLE',
          event: 'tankData',
          payload: {
            tanks: simulatedData,
            stationId: this.stationId,
            timestamp: new Date().toISOString()
          }
        });
        console.log('✅ [ATGService] Simulated tank data emitted to clients');
        
      }, this.commandInterval);
      
      // Hourly storage for simulation
      this.hourlyStorageInterval = setInterval(() => {
        this.storeLatestReadings();
      }, this.storageInterval);
      
      // Store initial reading
      setTimeout(() => {
        this.storeLatestReadings();
      }, 5000);
      
      console.log('✅ [ATGService] ATG simulation started successfully');
      logger.info('✅ ATG simulation started');
    }
  }

  generateSimulatedTankData() {
    const tanks = [];
    const baseTime = new Date();
    
    for (let i = 1; i <= 3; i++) {
      const tankNumber = i.toString().padStart(2, '0');
      
      // Generate realistic fluctuating values
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

    console.log('🚀 [ATGService] Starting ATG monitoring...');

    if (this.simulationMode) {
      await this.startSimulation();
    } else {
      this.isMonitoring = true;
      
      // Real-time monitoring (every 5 seconds)
      this.monitoringInterval = setInterval(async () => {
        await this.sendCommand();
      }, this.commandInterval);
      
      // Hourly storage (every 1 hour)
      this.hourlyStorageInterval = setInterval(() => {
        this.storeLatestReadings();
      }, this.storageInterval);
      
      logger.info('✅ ATG monitoring started');
      console.log('✅ [ATGService] Real-time monitoring: every 5 seconds');
      console.log('✅ [ATGService] Database storage: every 1 hour');
    }
  }

  async stopMonitoring() {
    console.log('⏹️ [ATGService] Stopping ATG monitoring...');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (this.hourlyStorageInterval) {
      clearInterval(this.hourlyStorageInterval);
      this.hourlyStorageInterval = null;
    }
    
    this.isMonitoring = false;
    console.log('✅ [ATGService] ATG monitoring stopped');
    logger.info('✅ ATG monitoring stopped');
  }

  async sendCommand() {
    if (!this.isConnected) return;

    try {
      const command = Buffer.from("\x01i20100", 'ascii');
      console.log('📤 [ATGService] Sending ATG command:', command.toString('hex'));
      
      return new Promise((resolve, reject) => {
        this.port.write(command, (err) => {
          if (err) {
            console.error('❌ [ATGService] Command send error:', err);
            reject(err);
          } else {
            console.log('✅ [ATGService] Command sent successfully');
            resolve();
          }
        });
      });
    } catch (error) {
      console.error('❌ [ATGService] Error sending ATG command:', error);
      logger.error('Error sending ATG command:', error);
      throw error;
    }
  }

  async getCurrentTankData({ stationId = null, interfaceCode = null } = {}) {
    try {
      console.log('📊 [ATGService] Getting current tank data...');
      console.log('🏢 Station ID:', stationId || 'all');
      console.log('🔌 Interface:', interfaceCode || 'any');
      
      const params = [];
      let where = 't.is_active = true';

      if (stationId) {
        params.push(stationId);
        where += ` AND t.station_id = $${params.length}`;
        console.log('🔍 Filtering by station:', stationId);
      }

      // Build interface filter SQL
      const ifaceFilterSql = interfaceCode
        ? `WHERE tr.tank_id = t.id AND tr.interface_source = $${params.length + 1}
           ORDER BY tr.reading_timestamp DESC LIMIT 1`
        : `WHERE tr.tank_id = t.id 
           ORDER BY tr.reading_timestamp DESC LIMIT 1`;

      if (interfaceCode) {
        params.push(String(interfaceCode).toUpperCase());
        console.log('🔍 Filtering by interface:', interfaceCode);
      }

      const sql = `
        SELECT
          t.id, t.station_id, t.tank_number, t.capacity,
          t.current_level, t.temperature, t.last_reading_at,
          p.name AS product_name, p.color AS product_color,
          tr.reading_timestamp, tr.total_volume, tr.oil_volume, tr.water_volume,
          tr.tc_volume, tr.ullage, tr.oil_height, tr.water_height, tr.interface_source
        FROM tanks t
        LEFT JOIN products p ON p.id = t.product_id
        LEFT JOIN LATERAL (
          SELECT reading_timestamp, total_volume, oil_volume, water_volume,
                 tc_volume, ullage, oil_height, water_height, interface_source
          FROM tank_readings tr
          ${ifaceFilterSql}
        ) tr ON true
        WHERE ${where}
        ORDER BY t.tank_number::int NULLS LAST, t.tank_number
      `;

      console.log('🔍 Executing query with params:', params);
      const result = await DatabaseManager.query(sql, params);
      console.log(`✅ Retrieved ${result.rows.length} tank records`);

      // Add detailed logging for debugging
      result.rows.forEach(tank => {
        console.log(`📊 Tank ${tank.tank_number}:`, {
          volume: tank.total_volume,
          interface: tank.interface_source,
          lastReading: tank.reading_timestamp
        });
      });

      return result.rows;
    } catch (error) {
      console.error('❌ [ATGService] Error getting current tank data:', error);
      logger.error('Error getting current tank data:', error);
      throw error;
    }
  }

  // NEW: Get tank readings for specific period
  async getTankReadingsForPeriod(tankId, startDate, endDate, limit = 100) {
    try {
      const query = `
        SELECT 
          tr.*,
          t.tank_number,
          p.name as product_name
        FROM tank_readings tr
        JOIN tanks t ON tr.tank_id = t.id
        LEFT JOIN products p ON t.product_id = p.id
        WHERE tr.tank_id = $1
          AND tr.reading_timestamp BETWEEN $2 AND $3
        ORDER BY tr.reading_timestamp DESC
        LIMIT $4
      `;
      
      const result = await DatabaseManager.query(query, [tankId, startDate, endDate, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting tank readings for period:', error);
      throw error;
    }
  }

  // NEW: Get daily tank summary
  async getDailyTankSummary(date, stationId = null) {
    try {
      let query = `
        SELECT 
          t.tank_number,
          t.capacity,
          p.name as product_name,
          s.name as station_name,
          COUNT(tr.id) as reading_count,
          AVG(tr.total_volume) as avg_volume,
          MIN(tr.total_volume) as min_volume,
          MAX(tr.total_volume) as max_volume,
          AVG(tr.temperature) as avg_temperature,
          MIN(tr.temperature) as min_temperature,
          MAX(tr.temperature) as max_temperature
        FROM tanks t
        LEFT JOIN tank_readings tr ON t.id = tr.tank_id 
          AND DATE(tr.reading_timestamp) = $1
        LEFT JOIN products p ON t.product_id = p.id
        LEFT JOIN stations s ON t.station_id = s.id
        WHERE t.is_active = true
      `;
      
      const params = [date];
      
      if (stationId) {
        query += ` AND t.station_id = $2`;
        params.push(stationId);
      }
      
      query += ` GROUP BY t.id, t.tank_number, t.capacity, p.name, s.name ORDER BY t.tank_number`;
      
      const result = await DatabaseManager.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting daily tank summary:', error);
      throw error;
    }
  }

  getStatus() {
    const status = {
      isConnected: this.isConnected,
      isMonitoring: this.isMonitoring,
      simulationMode: this.simulationMode,
      cacheSize: this.ieee754Cache.size,
      lastStoredTime: this.lastStoredTime,
      latestDataCount: this.latestTankData.size,
      lastUpdate: new Date().toISOString()
    };
    
    console.log('📊 [ATGService] Current status:', status);
    return status;
  }

  async stop() {
    console.log('🛑 [ATGService] Stopping ATG Service...');
    
    await this.stopMonitoring();
    
    if (this.port && this.isConnected) {
      this.port.close();
      this.isConnected = false;
      console.log('🔌 [ATGService] Serial port closed');
    }
    
    console.log('✅ [ATGService] ATG Service stopped');
    logger.info('✅ ATG Service stopped');
  }
}

export const ATGService = new ATGServiceClass();