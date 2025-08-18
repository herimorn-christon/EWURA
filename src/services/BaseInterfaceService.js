import { logger } from '../utils/logger.js';
import { DatabaseManager } from '../database/DatabaseManager.js';
import { socketService } from '../services/SocketService.js';

/**
 * Base class for all interface services (NPGIS/ATG and NFPP/PTS)
 * Provides common functionality for data processing and storage
 */
export class BaseInterfaceService {
  constructor(interfaceCode, stationId = null) {
    this.interfaceCode = interfaceCode.toUpperCase();
    this.stationId = stationId;
    this.isConnected = false;
    this.isMonitoring = false;
    this.lastStoredTime = null;
    this.latestTankData = new Map();
    this.latestTransactionData = [];
  }

  /**
   * Get current tank data with interface and station filtering
   */
  async getCurrentTankData({ stationId = null, interfaceCode = null } = {}) {
    try {
      logger.info(`[${this.interfaceCode}] Getting current tank data...`);
      
      const params = [];
      let where = 't.is_active = true';

      // Station filtering - admin can see all, others see their station
      if (stationId) {
        params.push(stationId);
        where += ` AND t.station_id = $${params.length}`;
      }

      // Interface filtering
      const ifaceFilterSql = interfaceCode
        ? `WHERE tr.tank_id = t.id AND tr.interface_source = $${params.length + 1}
           ORDER BY tr.reading_timestamp DESC LIMIT 1`
        : `WHERE tr.tank_id = t.id 
           ORDER BY tr.reading_timestamp DESC LIMIT 1`;

      if (interfaceCode) {
        params.push(String(interfaceCode).toUpperCase());
      }

      const sql = `
        SELECT
          t.id, t.station_id, t.tank_number, t.capacity,
          t.current_level, t.temperature, t.last_reading_at,
          p.name AS product_name, p.color AS product_color, p.code AS product_code,
          s.name AS station_name, s.code AS station_code,
          it.code AS interface_type,
          tr.reading_timestamp, tr.total_volume, tr.oil_volume, tr.water_volume,
          tr.tc_volume, tr.ullage, tr.oil_height, tr.water_height, 
          tr.temperature AS reading_temperature, tr.interface_source
        FROM tanks t
        LEFT JOIN products p ON p.id = t.product_id
        LEFT JOIN stations s ON s.id = t.station_id
        LEFT JOIN interface_types it ON s.interface_type_id = it.id
        LEFT JOIN LATERAL (
          SELECT reading_timestamp, total_volume, oil_volume, water_volume,
                 tc_volume, ullage, oil_height, water_height, temperature, interface_source
          FROM tank_readings tr
          ${ifaceFilterSql}
        ) tr ON true
        WHERE ${where}
        ORDER BY t.tank_number::int NULLS LAST, t.tank_number
      `;

      const result = await DatabaseManager.query(sql, params);
      
      logger.info(`[${this.interfaceCode}] Retrieved ${result.rows.length} tank records`);
      return result.rows;
    } catch (error) {
      logger.error(`[${this.interfaceCode}] Error getting current tank data:`, error);
      throw error;
    }
  }

  /**
   * Get transactions with interface and station filtering
   */
  async getTransactions({ stationId = null, interfaceCode = null, date = null, limit = 20 } = {}) {
    try {
      logger.info(`[${this.interfaceCode}] Getting transactions...`);
      
      const params = [];
      let where = '1=1';

      // Station filtering
      if (stationId) {
        params.push(stationId);
        where += ` AND st.station_id = $${params.length}`;
      }

      // Interface filtering
      if (interfaceCode) {
        params.push(String(interfaceCode).toUpperCase());
        where += ` AND st.interface_source = $${params.length}`;
      }

      // Date filtering
      if (date) {
        params.push(date);
        where += ` AND st.transaction_date = $${params.length}`;
      }

      // Limit
      params.push(limit);

      const sql = `
        SELECT 
          st.*,
          s.name AS station_name, s.code AS station_code,
          p.name AS product_name, p.code AS product_code,
          u.username AS user_name
        FROM sales_transactions st
        LEFT JOIN stations s ON st.station_id = s.id
        LEFT JOIN products p ON st.product_id = p.id
        LEFT JOIN users u ON st.user_id = u.id
        WHERE ${where}
        ORDER BY st.transaction_date DESC, st.transaction_time DESC
        LIMIT $${params.length}
      `;

      const result = await DatabaseManager.query(sql, params);
      
      logger.info(`[${this.interfaceCode}] Retrieved ${result.rows.length} transactions`);
      return result.rows;
    } catch (error) {
      logger.error(`[${this.interfaceCode}] Error getting transactions:`, error);
      throw error;
    }
  }

  /**
   * Store tank reading with interface source
   */
  async saveTankReading(tankData, stationId = null) {
    try {
      logger.info(`[${this.interfaceCode}] Saving tank reading for tank ${tankData.tankNumber || tankData.tank_number}`);

      // Find or create tank
      let tankResult = await DatabaseManager.query(
        'SELECT id FROM tanks WHERE tank_number = $1 AND ($2::uuid IS NULL OR station_id = $2)',
        [tankData.tankNumber || tankData.tank_number, stationId]
      );

      let tankId;
      if (tankResult.rows.length === 0) {
        // Create tank if it doesn't exist
        const createResult = await DatabaseManager.query(`
          INSERT INTO tanks (tank_number, capacity, station_id, is_active)
          VALUES ($1, $2, $3, true)
          RETURNING id
        `, [
          tankData.tankNumber || tankData.tank_number, 
          tankData.capacity || 10000,
          stationId
        ]);
        tankId = createResult.rows[0].id;
        logger.info(`[${this.interfaceCode}] Created new tank with ID: ${tankId}`);
      } else {
        tankId = tankResult.rows[0].id;
      }

      // Insert tank reading
      await DatabaseManager.query(`
        INSERT INTO tank_readings (
          tank_id, reading_timestamp, total_volume, oil_volume, water_volume,
          tc_volume, ullage, oil_height, water_height, temperature,
          reading_type, interface_source, raw_data
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'REAL_TIME', $11, $12)
        ON CONFLICT (tank_id, reading_timestamp)
        DO UPDATE SET
          total_volume = EXCLUDED.total_volume,
          oil_volume = EXCLUDED.oil_volume,
          water_volume = EXCLUDED.water_volume,
          tc_volume = EXCLUDED.tc_volume,
          ullage = EXCLUDED.ullage,
          oil_height = EXCLUDED.oil_height,
          water_height = EXCLUDED.water_height,
          temperature = EXCLUDED.temperature,
          interface_source = EXCLUDED.interface_source,
          raw_data = EXCLUDED.raw_data
      `, [
        tankId,
        tankData.timestamp || new Date().toISOString(),
        tankData.totalVolume || tankData.total_volume,
        tankData.oilVolume || tankData.oil_volume,
        tankData.waterVolume || tankData.water_volume,
        tankData.tcVolume || tankData.tc_volume,
        tankData.ullage,
        tankData.oilHeight || tankData.oil_height,
        tankData.waterHeight || tankData.water_height,
        tankData.temperature,
        this.interfaceCode,
        JSON.stringify(tankData)
      ]);

      // Update tank current level
      await DatabaseManager.query(`
        UPDATE tanks 
        SET current_level = $1, temperature = $2, last_reading_at = NOW()
        WHERE id = $3
      `, [
        tankData.totalVolume || tankData.total_volume || 0,
        tankData.temperature || 0,
        tankId
      ]);

      logger.info(`[${this.interfaceCode}] Tank reading saved successfully`);
      return tankId;
    } catch (error) {
      logger.error(`[${this.interfaceCode}] Error saving tank reading:`, error);
      throw error;
    }
  }

  /**
   * Store transaction with interface source
   */
  async saveTransaction(transactionData, stationId = null) {
    try {
      logger.info(`[${this.interfaceCode}] Saving transaction ${transactionData.transaction_id || transactionData.Transaction}`);

      const txData = {
        station_id: stationId,
        transaction_id: transactionData.transaction_id || transactionData.Transaction,
        pump_id: null,
        volume: parseFloat(transactionData.volume || transactionData.Volume || 0),
        unit_price: parseFloat(transactionData.price || transactionData.Price || 0),
        total_amount: parseFloat(transactionData.amount || transactionData.Amount || 0),
        transaction_date: transactionData.transaction_date || new Date().toISOString().split('T')[0],
        transaction_time: transactionData.transaction_time || new Date().toTimeString().split(' ')[0],
        interface_source: this.interfaceCode,
        customer_name: transactionData.customer_name || transactionData.CustomerName,
        fuel_grade_name: transactionData.fuel_grade_name || transactionData.FuelGradeName,
        efd_serial_number: transactionData.efd_serial_number || transactionData.EfdSerialNumber,
        tc_volume: parseFloat(transactionData.tc_volume || transactionData.TCVolume || 0),
        discount_amount: parseFloat(transactionData.discount_amount || transactionData.DiscountAmount || 0)
      };

      logger.debug(`[${this.interfaceCode}] Prepared txData`, txData);

      const insertSql = `
        INSERT INTO sales_transactions (
          station_id, transaction_id, volume, unit_price, total_amount,
          transaction_date, transaction_time, interface_source, customer_name,
          fuel_grade_name, efd_serial_number, tc_volume, discount_amount
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
      `;

      const insertParams = [
        txData.station_id, txData.transaction_id, txData.volume, txData.unit_price,
        txData.total_amount, txData.transaction_date, txData.transaction_time,
        txData.interface_source, txData.customer_name, txData.fuel_grade_name,
        txData.efd_serial_number, txData.tc_volume, txData.discount_amount
      ];

      // attempt insert and expose DB result for debugging
      let result = null;
      try {
        result = await DatabaseManager.query(insertSql, insertParams);
        logger.debug(`[${this.interfaceCode}] Insert result:`, { rowCount: result.rowCount, rows: result.rows && result.rows.length ? result.rows : undefined });
      } catch (dbErr) {
        logger.error(`[${this.interfaceCode}] Insert error:`, dbErr.code || dbErr.message || dbErr);
        // continue to upsert attempt below
      }

      if (result && result.rows && result.rows.length > 0) {
        logger.info(`[${this.interfaceCode}] Transaction inserted with id ${result.rows[0].id}`);
        return result.rows[0].id;
      }

      // Upsert/update fallback (log outcome)
      const updateSql = `
        UPDATE sales_transactions
        SET volume = $1,
            unit_price = $2,
            total_amount = $3,
            transaction_time = $4,
            interface_source = $5,
            customer_name = $6,
            fuel_grade_name = $7,
            efd_serial_number = $8,
            tc_volume = $9,
            discount_amount = $10
        WHERE station_id = $11 AND transaction_id = $12 AND transaction_date = $13
        RETURNING id
      `;
      const updateParams = [
        txData.volume, txData.unit_price, txData.total_amount, txData.transaction_time,
        txData.interface_source, txData.customer_name, txData.fuel_grade_name,
        txData.efd_serial_number, txData.tc_volume, txData.discount_amount,
        txData.station_id, txData.transaction_id, txData.transaction_date
      ];

      try {
        const updRes = await DatabaseManager.query(updateSql, updateParams);
        logger.debug(`[${this.interfaceCode}] Update result:`, { rowCount: updRes.rowCount, rows: updRes.rows && updRes.rows.length ? updRes.rows : undefined });
        if (updRes && updRes.rows && updRes.rows.length > 0) {
          logger.info(`[${this.interfaceCode}] Transaction updated/existing id ${updRes.rows[0].id}`);
          return updRes.rows[0].id;
        }
      } catch (upErr) {
        logger.error(`[${this.interfaceCode}] Update error:`, upErr.code || upErr.message || upErr);
      }

      logger.warn(`[${this.interfaceCode}] Transaction not inserted or updated (no rows returned)`, { txData });
      return null;
    } catch (error) {
      logger.error(`[${this.interfaceCode}] Error saving transaction:`, error);
      throw error;
    }
  }

  /**
   * Emit real-time data to WebSocket clients
   */
  emitRealTimeData(eventType, data) {
    try {
      socketService.emitToInterface(this.interfaceCode, eventType, {
        ...data,
        stationId: this.stationId,
        interfaceCode: this.interfaceCode,
        timestamp: new Date().toISOString()
      });
      
      logger.debug(`[${this.interfaceCode}] Emitted ${eventType} to WebSocket clients`);
    } catch (error) {
      logger.error(`[${this.interfaceCode}] Error emitting real-time data:`, error);
    }
  }

  /**
   * Get interface status
   */
  getStatus() {
    return {
      interfaceCode: this.interfaceCode,
      stationId: this.stationId,
      isConnected: this.isConnected,
      isMonitoring: this.isMonitoring,
      lastStoredTime: this.lastStoredTime,
      latestDataCount: this.latestTankData.size,
      lastUpdate: new Date().toISOString()
    };
  }
}