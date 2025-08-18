// src/controller/transactionController.js
import { stationModel } from '../models/Station.js';
import { interfaceManager } from '../services/InterfaceManager.js';
import { logger } from '../utils/logger.js';
import { DatabaseManager } from '../database/DatabaseManager.js';

// Simulation flag - can be disabled in production
const SIMULATE_DATA = true; 

export const receiveTransaction = async (req, res) => {
  try {
    // Get station API key and validate
    const apiKey = req.headers['api-key'];
    logger.info('🔑 API Key received:', apiKey);

    if (!apiKey) {
      return res.status(401).json({ 
        success: false,
        message: '🚫 Missing API key' 
      });
    }

    // Find station and interface type
    const station = await stationModel.findByApiKey(apiKey);
    if (!station?.is_active) {
      return res.status(403).json({
        success: false, 
        message: '🚫 Invalid or inactive station'
      });
    }

    // Get appropriate interface service
    const service = interfaceManager.getServiceForStation(station.id);
    logger.info(`🔌 Using interface: ${service.interfaceCode}`);

    // Process transactions (real or simulated)
    const transactions = req.body.Transactions || [];
    let processed = 0;

    for (const tx of transactions) {
      await service.saveTransaction(tx, station.id);
      processed++;
    }

    return res.status(200).json({
      success: true,
      message: '✅ Transactions processed',
      data: {
        station: station.code,
        interface: service.interfaceCode,
        processed,
        simulated: SIMULATE_DATA
      }
    });

  } catch (error) {
    logger.error('❌ Transaction error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const { station_id, interface_code, date, limit = 20 } = req.query;

    if (!station_id) {
      return res.status(400).json({
        message: '🚫 station_id required'
      });
    }

    // Get service based on interface or station
    const service = interface_code ?
      interfaceManager.getServiceByCode(interface_code) :
      interfaceManager.getServiceForStation(station_id);

    const transactions = await service.getTransactions({
      stationId: station_id,
      date,
      limit: parseInt(limit)
    });

    res.json(transactions);

  } catch (error) {
    res.status(500).json({
      message: '❌ Failed to fetch transactions',
      error: error.message
    });
  }
};

export const getDailySales = async (req, res) => {
  try {
    const { stationId, date } = req.query;
    
    if (!stationId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Station ID and date are required'
      });
    }

    const result = await DatabaseManager.query(`
      SELECT 
        DATE_TRUNC('hour', transaction_date) as hour,
        COUNT(*) as count,
        SUM(volume) as total_volume,
        SUM(amount) as total_amount
      FROM sales_transactions
      WHERE station_id = $1 
      AND DATE(transaction_date) = DATE($2)
      GROUP BY DATE_TRUNC('hour', transaction_date)
      ORDER BY hour
    `, [stationId, date]);

    return res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error getting daily sales:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get daily sales'
    });
  }
};
