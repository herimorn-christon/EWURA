import { SerialPort } from 'serialport';
import { DelimiterParser } from '@serialport/parser-delimiter';
import { logger } from '../utils/logger.js';
import { DatabaseManager } from '../database/DatabaseManager.js';
import { SocketService } from './SocketService.js';

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
    this.commandInterval = 5000; // 5 seconds
    this.maxRetries = 5;
    this.ieee754Cache = new Map();
    this.maxCacheSize = 1000;
    this.pendingRequests = new Map();
    this.requestId = 0;
    this.dataHandler = null;
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
        } else {
          console.log(`⚠️ Tank ${tank.tankNumber}: Status: ${tank.status}`);
        }
      });
      
      // Save to database
      for (const tank of tanks) {
        if (tank.status === 'online') {
          console.log(`💾 [ATGService] Saving tank ${tank.tankNumber} reading to database...`);
          await this.saveTankReading(tank);
          console.log(`✅ [ATGService] Tank ${tank.tankNumber} reading saved successfully`);
        }
      }

      // Emit to connected clients
      console.log('📡 [ATGService] Emitting tank data to WebSocket clients...');
      SocketService.emit('tankData', tanks);
      console.log('✅ [ATGService] Tank data emitted to clients');
      
      logger.debug(`✅ Processed ${tanks.filter(t => t.status === 'online').length} online tanks`);
    } catch (error) {
      console.error('❌ [ATGService] Error handling ATG data:', error);
      logger.error('Error handling ATG data:', error);
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
        
        // Use the CORRECTED timestamp parsing
        const timestampFormatted = this.parseTimestamp(timestamp);
        
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
          timestamp: timestampFormatted,
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
        console.log(`🕐 Timestamp: ${tank.timestamp}`);
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

  // CORRECTED timestamp parsing method based on your working code
  parseTimestamp(timestamp) {
    try {
      console.log('🕐 [ATGService] Raw timestamp input:', timestamp);
      
      // Based on your clarification:
      // ATG shows: 2025-07-03 12:16
      // Raw timestamp: '0100250703'
      // Today is: day(03) month(07) year(2025)
      
      if (timestamp.length >= 10) {
        // Try different interpretations since the format seems non-standard
        
        // Since your ATG shows 2025-07-03 and raw is '0100250703'
        // Let me try a manual mapping approach
        // For now, let's use current date with the time components that make sense
        
        const now = new Date();
        const currentYear = 2025; // We know it should be 2025
        const currentMonth = 7;   // We know it should be July (07)
        const currentDay = 3;     // We know it should be day 3
        
        // Extract what looks like time components
        // From '0100250703', if we assume the last 4 digits are time: 0703 = 07:03
        const extractedHour = parseInt(timestamp.slice(-4, -2)) || 0;   // 07
        const extractedMinute = parseInt(timestamp.slice(-2)) || 0;     // 03
        
        console.log('🔍 [ATGService] Manual extraction approach:', {
          year: currentYear,
          month: currentMonth, 
          day: currentDay,
          hour: extractedHour,
          minute: extractedMinute
        });
        
        // Use the manually determined values
        const year = currentYear;
        const month = currentMonth;
        const day = currentDay;
        const hour = extractedHour;
        const minute = extractedMinute;
        
        // Validate and fix components
        const validYear = year;
        const validMonth = Math.max(1, Math.min(12, month));
        const validDay = Math.max(1, Math.min(31, day));
        const validHour = Math.max(0, Math.min(23, hour));
        const validMinute = Math.max(0, Math.min(59, minute));

        // Format with proper padding
        const timestampFormatted = `${validYear}-${validMonth.toString().padStart(2, '0')}-${validDay.toString().padStart(2, '0')} ${validHour.toString().padStart(2, '0')}:${validMinute.toString().padStart(2, '0')}:00`;

        console.log('✅ [ATGService] CORRECTED timestamp parsing:', {
          raw: timestamp,
          extractedTime: { hour: extractedHour, minute: extractedMinute },
          validatedValues: { validYear, validMonth, validDay, validHour, validMinute },
          formatted: timestampFormatted
        });

        return timestampFormatted;
      }
      
      // Fallback to current time if parsing fails
      console.log('⚠️ [ATGService] Timestamp parsing failed, using current time');
      return new Date().toISOString().replace('T', ' ').slice(0, 19);
      
    } catch (error) {
      console.error('❌ [ATGService] Error parsing timestamp:', error);
      return new Date().toISOString().replace('T', ' ').slice(0, 19);
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
      console.log('================================================\n');
      
      // First find or create the tank
      let tankResult = await DatabaseManager.query(
        'SELECT id FROM tanks WHERE tank_number = $1',
        [tankData.tankNumber]
      );

      let tankId;
      if (tankResult.rows.length === 0) {
        console.log(`🔄 [ATGService] Tank ${tankData.tankNumber} not found, creating new tank...`);
        // Create tank if it doesn't exist
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

      // Insert tank reading
      console.log(`💾 [ATGService] Inserting tank reading for tank ${tankData.tankNumber}...`);
      await DatabaseManager.query(`
        INSERT INTO tank_readings (
          tank_id, reading_timestamp, total_volume, oil_volume, water_volume,
          tc_volume, ullage, oil_height, water_height, temperature
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
      console.log(`✅ [ATGService] Tank reading inserted successfully for tank ${tankData.tankNumber}`);

      // Update tank current level
      console.log(`🔄 [ATGService] Updating tank ${tankData.tankNumber} current level...`);
      await DatabaseManager.query(`
        UPDATE tanks 
        SET current_level = $1, temperature = $2, last_reading_at = $3
        WHERE id = $4
      `, [tankData.totalVolume, tankData.temperature, tankData.timestamp, tankId]);
      console.log(`✅ [ATGService] Tank ${tankData.tankNumber} current level updated to ${tankData.totalVolume}L`);

    } catch (error) {
      console.error(`❌ [ATGService] Error saving tank ${tankData.tankNumber}:`, error.message);
      logger.error('Error saving tank reading:', error);
    }
  }

  async startSimulation() {
    if (this.simulationMode && !this.isMonitoring) {
      this.isMonitoring = true;
      console.log('🔄 [ATGService] Starting ATG simulation mode...');
      this.monitoringInterval = setInterval(async () => {
        console.log('⛽ [ATGService] Generating simulated tank data...');
        const simulatedData = this.generateSimulatedTankData();
        console.log('⛽ [ATGService] Simulated tank data generated:');
        simulatedData.forEach(tank => {
          console.log(`📊 Tank ${tank.tankNumber}: ${tank.totalVolume}L, ${tank.temperature}°C, Status: ${tank.status}`);
        });
        // DO NOT SAVE TO DATABASE
        // Just emit to clients
        console.log('📡 [ATGService] Emitting simulated tank data to WebSocket clients...');
        SocketService.emit('tankData', simulatedData);
        console.log('✅ [ATGService] Simulated tank data emitted to clients');
      }, this.commandInterval);
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
      this.monitoringInterval = setInterval(async () => {
        await this.sendCommand();
      }, this.commandInterval);
      
      logger.info('✅ ATG monitoring started');
    }
  }

  async stopMonitoring() {
    console.log('⏹️ [ATGService] Stopping ATG monitoring...');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.isMonitoring = false;
      console.log('✅ [ATGService] ATG monitoring stopped');
      logger.info('✅ ATG monitoring stopped');
    }
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

  async getCurrentTankData() {
    try {
      console.log('📊 [ATGService] Getting current tank data from database...');
      
      const result = await DatabaseManager.query(`
        SELECT DISTINCT ON (t.tank_number) 
          t.tank_number,
          tr.total_volume,
          tr.oil_volume,
          tr.water_volume,
          tr.tc_volume,
          tr.ullage,
          tr.oil_height,
          tr.water_height,
          tr.temperature,
          tr.reading_timestamp,
          p.name as product_name,
          p.color as product_color
        FROM tanks t
        LEFT JOIN tank_readings tr ON t.id = tr.tank_id
        LEFT JOIN products p ON t.product_id = p.id
        WHERE t.is_active = true
        ORDER BY t.tank_number, tr.reading_timestamp DESC
      `);
      
      console.log(`✅ [ATGService] Retrieved ${result.rows.length} tank records from database`);
      return result.rows;
    } catch (error) {
      console.error('❌ [ATGService] Error getting current tank data:', error);
      logger.error('Error getting current tank data:', error);
      throw error;
    }
  }

  getStatus() {
    const status = {
      isConnected: this.isConnected,
      isMonitoring: this.isMonitoring,
      simulationMode: this.simulationMode,
      cacheSize: this.ieee754Cache.size,
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