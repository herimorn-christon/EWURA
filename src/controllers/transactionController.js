// src/controller/transactionController.js
import { transactionModel } from '../models/transactionModel.js';
import { logger } from '../utils/logger.js';  // Import your logger here

// src/controllers/transactionController.js

export const receiveTransaction = async (req, res) => {
  try {
    console.log('📥 Received transaction data:', req.body);

    // Optional: Validate required fields
    const requiredFields = [
      'station_id',
      'product_id',
      'user_id',
      'transaction_date',
      'transaction_time',
      'volume',
      'unit_price',
      'total_amount'
    ];

    const missingFields = requiredFields.filter(field => !(field in req.body));

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: '🚫 Missing required fields',
        missing: missingFields
      });
    }

    // Respond without inserting
    return res.status(200).json({
      message: '✅ Transaction received (not inserted)',
      received: req.body
    });
  } catch (error) {
    console.error('❌ Error receiving transaction:', error);
    res.status(500).json({ message: '❌ Failed to receive transaction', error: error.message });
  }
};


export const getTransactions = async (req, res) => {
  try {
    const { station_id, date, limit = 20 } = req.query;

    if (!station_id) {
      return res.status(400).json({ message: '🚫 station_id is required' });
    }

    const result = await transactionModel.getRecentTransactionsByStation(station_id, limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: '❌ Failed to fetch transactions', error: error.message });
  }
};

export const getDailySales = async (req, res) => {
  try {
    const { station_id, date } = req.query;

    if (!station_id || !date) {
      return res.status(400).json({ message: '🚫 station_id and date are required' });
    }

    const result = await transactionModel.getDailySales(station_id, date);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: '❌ Failed to fetch daily sales', error: error.message });
  }
};
