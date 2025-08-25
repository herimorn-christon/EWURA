import axios from 'axios';
import moment from 'moment';
import { BaseInterfaceService } from './BaseInterfaceService.js';
import { logger } from '../utils/logger.js';
import { DatabaseManager } from '../database/DatabaseManager.js';

/**
 * NFPP (PTS/VFD) Interface Service
 * Handles communication with PTS devices for tank monitoring and transactions
 */
export class NFPPService extends BaseInterfaceService {
  constructor(stationId = null, config = {}) {
    super('NFPP', stationId);
    
    this.config = {
      host: config.host || process.env.PTS_HOST || '192.168.1.117',
      user: config.user || process.env.PTS_USER || 'admin',
      pass: config.pass || process.env.PTS_PASS || 'admin',
      paths: ['/json/PTS', '/json/pts', '/jsonPTS', '/json', '/PTS', '/pts'],
      ...config
    };
    
    this.activePath = null;
    this.discoveredProbes = [];
    this.lastTimeSyncAt = 0;
    this.probeInterval = null;
    this.transactionInterval = null;
    
    // Polling intervals
    this.probePollSeconds = 10;
    this.txPollMinutes = 5;
    this.timeDriftThreshold = 60; // seconds

    this.simulationMode = process.env.NODE_ENV !== 'production';
  }

  async initialize() {
    try {
      logger.info(`[${this.interfaceCode}] Initializing PTS service...`);
      
      await this.discoverPath();
      await this.ensurePtsTime();
      await this.discoverProbes();
      
      logger.info(`[${this.interfaceCode}] Initialized successfully`);
      this.isConnected = true;
    } catch (error) {
      logger.error(`[${this.interfaceCode}] Initialization failed:`, error);
      this.isConnected = false;
      throw error;
    }
  }

  basicHeaders() {
    const token = Buffer.from(`${this.config.user}:${this.config.pass}`).toString('base64');
    return { 
      Authorization: `Basic ${token}`, 
      'Content-Type': 'application/json' 
    };
  }

  async discoverPath() {
    logger.info(`[${this.interfaceCode}] Discovering PTS JSON endpoint...`);
    
    for (const path of this.config.paths) {
      try {
        const response = await axios.post(
          `http://${this.config.host}${path}`,
          { Protocol: 'jsonPTS', Packets: [{ Id: 1, Type: 'GetDateTime' }] },
          { 
            headers: this.basicHeaders(), 
            timeout: 6000, 
            validateStatus: () => true 
          }
        );
        
        if (response.status >= 200 && response.status < 300 && response.data?.Packets?.[0]) {
          this.activePath = path;
          logger.info(`[${this.interfaceCode}] Using ${path} with Basic auth`);
          return;
        }
      } catch (error) {
        logger.debug(`[${this.interfaceCode}] Path ${path} failed: ${error.message}`);
      }
    }
    
    throw new Error('Could not find a working JSON path; verify IP/credentials.');
  }

  async ptsPost(packet, retries = 2) {
    if (!this.activePath) await this.discoverPath();
    
    const url = `http://${this.config.host}${this.activePath}`;
    const body = { Protocol: 'jsonPTS', Packets: [packet] };

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await axios.post(url, body, {
          headers: this.basicHeaders(),
          timeout: 12000,
          validateStatus: () => true
        });
        
        if (response.status >= 200 && response.status < 300) {
          return response.data;
        }
        
        throw new Error(`PTS ${response.status}: ${JSON.stringify(response.data || {})}`);
      } catch (error) {
        const wait = Math.min(2000 * (attempt + 1), 8000);
        logger.warn(`[${this.interfaceCode}] ptsPost(${packet.Type}) failed: ${error.message} — retry in ${wait}ms`);
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, wait));
        }
      }
    }
    
    throw new Error(`PTS request failed after retries: ${packet.Type}`);
  }

  async ensurePtsTime() {
    try {
      // Get external time
      const tzResponse = await axios.get('http://worldtimeapi.org/api/timezone/Africa/Dar_es_Salaam', { timeout: 7000 });
      const externalIso = tzResponse.data?.datetime || moment().format();
      
      const ext = moment.parseZone(externalIso);
      const extUtc = ext.clone().utc();
      const extUtcStr = extUtc.format('YYYY-MM-DDTHH:mm:ss');
      const utcOffsetMin = -ext.utcOffset();

      // Get PTS time
      const ptsData = await this.ptsPost({ Id: 1, Type: 'GetDateTime' });
      const ptsTime = ptsData?.Packets?.[0]?.Data;
      
      if (!ptsTime) throw new Error('GetDateTime returned no Data');

      const ptsUtc = moment.utc(ptsTime.DateTime).subtract(ptsTime.UTCOffset || 0, 'minutes');
      const diff = Math.abs(extUtc.diff(ptsUtc, 'seconds'));
      
      logger.info(`[${this.interfaceCode}] PTS time drift vs external: ${diff}s`);
      
      if (diff > this.timeDriftThreshold) {
        logger.warn(`[${this.interfaceCode}] Syncing PTS time to external...`);
        await this.ptsPost({
          Id: 1,
          Type: 'SetDateTime',
          Data: { DateTime: extUtcStr, AutoSynchronize: true, UTCOffset: utcOffsetMin }
        });
      }
      
      this.lastTimeSyncAt = Date.now();
    } catch (error) {
      logger.warn(`[${this.interfaceCode}] Time sync failed: ${error.message}`);
    }
  }

  async discoverProbes() {
    try {
      const data = await this.ptsPost({ Id: 1, Type: 'GetProbesConfiguration' });
      const probes = data?.Packets?.[0]?.Data?.Probes || [];
      
      this.discoveredProbes = probes.map(p => p.Id).filter(Number.isInteger);
      logger.info(`[${this.interfaceCode}] Discovered probes: [${this.discoveredProbes.join(', ')}]`);
    } catch (error) {
      logger.warn(`[${this.interfaceCode}] Probe discovery failed: ${error.message}`);
      this.discoveredProbes = [];
    }
  }

  async getProbeMeasurements(probeId) {
    logger.debug(`[${this.interfaceCode}] Requesting measurements for Probe ${probeId}...`);
    
    const data = await this.ptsPost({ 
      Id: 1, 
      Type: 'ProbeGetMeasurements', 
      Data: { Probe: probeId } 
    });
    
    const packet = data?.Packets?.[0];
    if (packet?.Error) {
      throw new Error(packet.Message || 'ProbeGetMeasurements error');
    }
    
    if (!packet?.Data) {
      throw new Error('ProbeGetMeasurements: no Data');
    }

    // Convert PTS data to our standard format
    const ptsData = packet.Data;
    return {
      timestamp: ptsData.DateTime || moment.utc().format('YYYY-MM-DDTHH:mm:ss'),
      tankNumber: ptsData.Probe?.toString().padStart(2, '0'),
      tank_number: ptsData.Probe?.toString().padStart(2, '0'),
      totalVolume: Math.round((ptsData.ProductVolume || 0) * 10) / 10,
      total_volume: Math.round((ptsData.ProductVolume || 0) * 10) / 10,
      waterVolume: Math.round((ptsData.WaterVolume || 0) * 10) / 10,
      water_volume: Math.round((ptsData.WaterVolume || 0) * 10) / 10,
      oilVolume: Math.round(((ptsData.ProductVolume || 0) - (ptsData.WaterVolume || 0)) * 10) / 10,
      oil_volume: Math.round(((ptsData.ProductVolume || 0) - (ptsData.WaterVolume || 0)) * 10) / 10,
      ullage: Math.round((ptsData.ProductUllage || 0) * 10) / 10,
      oilHeight: Math.round((ptsData.ProductHeight || 0) * 10) / 10,
      oil_height: Math.round((ptsData.ProductHeight || 0) * 10) / 10,
      waterHeight: Math.round((ptsData.WaterHeight || 0) * 10) / 10,
      water_height: Math.round((ptsData.WaterHeight || 0) * 10) / 10,
      temperature: Math.round((ptsData.Temperature || 0) * 10) / 10,
      tcVolume: Math.round((ptsData.ProductTCVolume || 0) * 10) / 10,
      tc_volume: Math.round((ptsData.ProductTCVolume || 0) * 10) / 10,
      density: ptsData.ProductDensity || 0,
      mass: ptsData.ProductMass || 0,
      fillPercentage: ptsData.TankFillingPercentage || 0,
      status: ptsData.Status || 'online',
      fuelGradeId: ptsData.FuelGradeId,
      fuelGradeName: ptsData.FuelGradeName
    };
  }

  async getPumpTransactions(startISO, endISO) {
    logger.debug(`[${this.interfaceCode}] Requesting transactions: ${startISO} → ${endISO}`);
    
    const data = await this.ptsPost({
      Id: 1,
      Type: 'ReportGetPumpTransactions',
      Data: { Pump: 0, DateTimeStart: startISO, DateTimeEnd: endISO }
    });

    const packet = data?.Packets?.[0];
    if (packet?.Error) {
      throw new Error(packet.Message || 'ReportGetPumpTransactions error');
    }

    const transactions = packet?.Data || [];
    logger.info(`[${this.interfaceCode}] Retrieved ${transactions.length} transactions`);
    
    return transactions.map(tx => ({
      transaction_id: tx.Transaction,
      Transaction: tx.Transaction,
      pump: tx.Pump,
      Pump: tx.Pump,
      nozzle: tx.Nozzle,
      Nozzle: tx.Nozzle,
      volume: tx.Volume,
      Volume: tx.Volume,
      tc_volume: tx.TCVolume,
      TCVolume: tx.TCVolume,
      price: tx.Price,
      Price: tx.Price,
      amount: tx.Amount,
      Amount: tx.Amount,
      total_volume: tx.TotalVolume,
      TotalVolume: tx.TotalVolume,
      total_amount: tx.TotalAmount,
      TotalAmount: tx.TotalAmount,
      datetime_start: tx.DateTimeStart,
      DateTimeStart: tx.DateTimeStart,
      datetime_end: tx.DateTime,
      DateTime: tx.DateTime,
      tag: tx.Tag,
      Tag: tx.Tag,
      user_id: tx.UserId,
      UserId: tx.UserId
    }));
  }

  async startMonitoring() {
    if (this.isMonitoring) return;

    logger.info(`[${this.interfaceCode}] Starting monitoring...`);

    try {
      let station = null;

      // Polling loop to check for station registration
      const resolveStation = async () => {
        while (!station) {
          try {
            const stationQuery = await DatabaseManager.query(`
              SELECT s.*, i.code as interface_code, i.name as interface_name
              FROM stations s 
              LEFT JOIN interface_types i ON s.interface_type_id = i.id
              WHERE s.is_active = true AND s.interface_type_id IS NOT NULL
              ORDER BY s.created_at
              LIMIT 1
            `);

            station = stationQuery?.rows?.[0];

            if (!station) {
              logger.warn(`[${this.interfaceCode}] No active station found. Retrying in 10 seconds...`);
              await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds before retrying
            }
          } catch (error) {
            logger.error(`[${this.interfaceCode}] Error during station resolution:`, error);
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds before retrying
          }
        }
      };

      // Start the polling loop in the background
      resolveStation();

      // Continue monitoring once a station is resolved
      const checkStationResolved = setInterval(async () => {
        if (station) {
          clearInterval(checkStationResolved);

          // Only proceed if station uses NFPP interface
          if (station.interface_code !== 'NFPP') {
            logger.info(`[${this.interfaceCode}] Station ${station.code} uses ${station.interface_code || 'unknown'} interface - skipping NFPP monitoring`);
            return;
          }

          this.stationId = station.id;
          this.isMonitoring = true;

          logger.info(`[${this.interfaceCode}] Monitoring started for station ${station.code}`);

          // Generate simulated transactions in dev mode
          if (this.simulationMode) {
            try {
              const simulatedTxs = this._generateSimulatedTransactions(5);
              await this.receiveTransactionData({ transactions: simulatedTxs }, station);
              logger.info(`[${this.interfaceCode}] Injected ${simulatedTxs.length} simulated transactions for station ${station.code}`);
            } catch (err) {
              logger.error(`[${this.interfaceCode}] Failed to inject simulated transactions:`, err);
            }
          }

          // Start monitoring loops
          this.probeInterval = setInterval(async () => {
            await this.probesLoop();
          }, this.probePollSeconds * 1000);

          this.transactionInterval = setInterval(async () => {
            await this.transactionsLoop();
          }, this.txPollMinutes * 60 * 1000);

          // Start immediately
          setTimeout(() => this.probesLoop(), 1000);
          setTimeout(() => this.transactionsLoop(), 2000);
        }
      }, 1000); // Check every second if the station is resolved
    } catch (error) {
      logger.error(`[${this.interfaceCode}] Error starting monitoring:`, error);
      this.isMonitoring = false;
    }
  }

  async stopMonitoring() {
    logger.info(`[${this.interfaceCode}] Stopping monitoring...`);
    
    if (probeInterval) {
      clearInterval(this.probeInterval);
      this.probeInterval = null;
    }
    
    if (this.transactionInterval) {
      clearInterval(this.transactionInterval);
      this.transactionInterval = null;
    }
    
    this.isMonitoring = false;
  }

  async probesLoop() {
    try {
      // Hourly time check
      if (Date.now() - this.lastTimeSyncAt > 60 * 60 * 1000) {
        await this.ensurePtsTime();
      }

      // Rediscover probes if none found
      if (!this.discoveredProbes.length) {
        await this.discoverProbes();
      }

      const tanks = [];
      
      // Poll each probe
      for (const probeId of this.discoveredProbes) {
        try {
          const tankData = await this.getProbeMeasurements(probeId);
          tanks.push(tankData);
          
          // Store latest data
          this.latestTankData.set(tankData.tankNumber, tankData);
          
          // Save to database
          await this.saveTankReading(tankData, this.stationId);
          
          logger.debug(`[${this.interfaceCode}] Probe ${probeId} @ ${tankData.timestamp} Vol=${tankData.totalVolume} Temp=${tankData.temperature}`);
        } catch (error) {
          if (!/NOT_FOUND/i.test(error.message)) {
            logger.warn(`[${this.interfaceCode}] Probe ${probeId} error: ${error.message}`);
          }
        }
      }

      // Emit real-time data
      if (tanks.length > 0) {
        this.emitRealTimeData('tankData', { tanks });
      }
    } catch (error) {
      logger.error(`[${this.interfaceCode}] probesLoop error: ${error.message}`);
    }
  }

  async transactionsLoop() {
    try {
      // Get last transaction time from our sales_transactions table
      const lastTxResult = await DatabaseManager.query(
        'SELECT MAX(transaction_time) AS last_time FROM sales_transactions WHERE station_id = $1 AND interface_source = $2',
        [this.stationId, this.interfaceCode]
      );
      
      const lastTime = lastTxResult?.rows?.[0]?.last_time;
      const now = moment.utc();
      const start = lastTime ? moment.utc(lastTime) : now.clone().startOf('day');
      
      const startISO = start.format('YYYY-MM-DDTHH:mm:ss');
      const endISO = now.format('YYYY-MM-DDTHH:mm:ss');

      // Get transactions from PTS
      const transactions = await this.getPumpTransactions(startISO, endISO);
      
      // Store transactions using base service method
      let inserted = 0;
      for (const tx of transactions) {
        try {
          await this.saveTransaction(tx, this.stationId);
          inserted++;
        } catch (error) {
          // Transaction might already exist, continue
          logger.debug(`[${this.interfaceCode}] Transaction ${tx.transaction_id} already exists`);
        }
      }

      if (inserted > 0) {
        logger.info(`[${this.interfaceCode}] Stored ${inserted} new transactions`);
        this.emitRealTimeData('transactions', { count: inserted, sample: transactions.slice(0, 5) });
      }
    } catch (error) {
      logger.error(`[${this.interfaceCode}] transactionsLoop error: ${error.message}`);
    }
  }

  /**
   * Receive transaction data from external systems (NFPP interface)
   * For NFPP, this handles external transaction submissions via API
   */
  async receiveTransactionData(transactionData, station) {
    try {
      logger.info(`[${this.interfaceCode}] Processing external transaction data for station ${station.code}`);
      
      const { ewuraLicenseNo, transactions } = transactionData;
      
      // Validate EWURA license matches station
      if (ewuraLicenseNo && station.ewura_license_no !== ewuraLicenseNo) {
        throw new Error('EWURA license number mismatch');
      }

      // Format transactions for our database
      const formattedTransactions = transactions.map(tx => ({
        station_id: station.id,
        transaction_id: tx.Transaction || tx.transaction_id,
        pump_id: null,
        volume: parseFloat(tx.Volume || tx.volume || 0),
        unit_price: parseFloat(tx.Price || tx.unit_price || 0),
        total_amount: parseFloat(tx.Amount || tx.total_amount || 0),
        transaction_date: tx.transaction_date || new Date().toISOString().split('T')[0],
        transaction_time: tx.transaction_time || new Date().toTimeString().split(' ')[0],
        interface_source: this.interfaceCode,
        customer_name: tx.CustomerName || tx.customer_name,
        fuel_grade_name: tx.FuelGradeName || tx.fuel_grade_name,
        efd_serial_number: tx.EfdSerialNumber || tx.efd_serial_number,
        tc_volume: parseFloat(tx.TCVolume || tx.tc_volume || 0),
        discount_amount: parseFloat(tx.DiscountAmount || tx.discount_amount || 0)
      }));

      // Save transactions using base service method
      for (const tx of formattedTransactions) {
        await this.saveTransaction(tx, station.id);
      }

      // Emit real-time data
      this.emitRealTimeData('transactions', {
        station: { id: station.id, code: station.code },
        transactions: formattedTransactions,
        count: formattedTransactions.length
      });

      logger.info(`[${this.interfaceCode}] Processed ${formattedTransactions.length} external transactions for ${station.code}`);
      
      return { count: formattedTransactions.length };
    } catch (error) {
      logger.error(`[${this.interfaceCode}] External transaction processing error:`, error);
      throw error;
    }
  }

  // emitRealTimeData method is inherited from BaseInterfaceService

  // Add simulation data generators
  _generateSimulatedTransactions(count = 5) {
    const now = new Date();
    return Array.from({ length: count }).map((_, i) => ({
      Transaction: `NFPP-SIM-${now.getTime()}-${i}`,
      Pump: Math.floor(Math.random() * 4) + 1,
      Nozzle: Math.floor(Math.random() * 2) + 1,
      Volume: (Math.random() * 30 + 1).toFixed(3),
      Price: (Math.random() * 0.8 + 0.8).toFixed(2),
      Amount: ((Math.random() * 30 + 1) * (Math.random() * 0.8 + 0.8)).toFixed(2),
      transaction_date: now.toISOString().split('T')[0],
      transaction_time: now.toTimeString().split(' ')[0],
      FuelGradeName: ['Diesel','Petrol','Kerosene'][Math.floor(Math.random()*3)],
      CustomerName: `NFPP Sim Customer ${Math.floor(Math.random()*1000)}`,
      EfdSerialNumber: `EFD-NFPP-${Math.floor(Math.random()*9999)}`,
      interface_source: 'NFPP_SIM'
    }));
  }

  // Add method to clear simulated data
  async clearSimulatedTransactions(stationId = null) {
    try {
      const sql = stationId
        ? 'DELETE FROM sales_transactions WHERE interface_source = $1 AND station_id = $2'
        : 'DELETE FROM sales_transactions WHERE interface_source = $1';
      const params = stationId ? ['NFPP_SIM', stationId] : ['NFPP_SIM'];
      
      const result = await DatabaseManager.query(sql, params);
      logger.info(`[${this.interfaceCode}] Cleared ${result.rowCount} simulated transactions`);
      return { deleted: result.rowCount };
    } catch (err) {
      logger.error(`[${this.interfaceCode}] Failed to clear simulated transactions:`, err);
      throw err;
    }
  }

  async stop() {
    logger.info(`[${this.interfaceCode}] Stopping service...`);
    
    await this.stopMonitoring();
    this.isConnected = false;
    
    logger.info(`[${this.interfaceCode}] Service stopped`);
  }
}

export const nfppService = new NFPPService();