// src/controller/transactionController.js
import { transactionModel } from '../models/transactionModel.js';
import { logger } from '../utils/logger.js';  // Import your logger here

// src/controllers/transactionController.js

export const receiveTransaction = async (req, res) => {
  try {
    // 🔐 API Key Check
    const apiKey = req.headers['api-key'];
    const expectedApiKey = process.env.API_KEY || 'a9f0c2b3d8e14e1b9f10a2c6f4e748c1d8f2b3e9a4d1c7b2f9e0d1a4e2f3c5a6';

    if (!apiKey) {
      return res.status(401).json({ message: '🚫 Missing API key in headers' });
    }

    if (apiKey !== expectedApiKey) {
      return res.status(403).json({ message: '🚫 Invalid API key' });
    }

    // ✅ Log received data (not inserting)
    console.log('📥 Received transaction payload:', JSON.stringify(req.body, null, 2));
    logger.info('📥 Transaction payload received', req.body);

    return res.status(200).json({
      message: '✅ Transaction data received (not inserted)',
      received: req.body
    });
  } catch (error) {
    console.error('❌ Error receiving transaction:', error);
    res.status(500).json({ message: '❌ Failed to receive transaction', error: error.message });
  }
};

// export const receiveTransaction = async (req, res) => {
//   try {
//     const apiKey = 'a9f0c2b3d8e14e1b9f10a2c6f4e748c1d8f2b3e9a4d1c7b2f9e0d1a4e2f3c5a6';
//     const expectedApiKey = process.env.API_KEY || 'a9f0c2b3d8e14e1b9f10a2c6f4e748c1d8f2b3e9a4d1c7b2f9e0d1a4e2f3c5a6';

//     if (!apiKey) {
//       return res.status(401).json({ message: '🚫 Missing API key in headers' });
//     }

//     if (apiKey !== expectedApiKey) {
//       return res.status(403).json({ message: '🚫 Invalid API key' });
//     }

//     const { EwuraLicenseNo, Transactions } = req.body;

//     const formattedTransactions = Transactions.map(tx => ({
//       station_license: EwuraLicenseNo,
//       pump: tx.Pump,
//       nozzle: tx.Nozzle,
//       volume: parseFloat(tx.Volume),
//       price: parseFloat(tx.Price),
//       amount: parseFloat(tx.Amount),
//       transaction_id: tx.Transaction,
//       discount_amount: parseFloat(tx.DiscountAmount),
//       total_volume: parseFloat(tx.TotalVolume),
//       total_amount: parseFloat(tx.TotalAmount),
//       customer_name: tx.CustomerName,
//       fuel_grade_name: tx.FuelGradeName,
//       efd_serial_number: tx.EfdSerialNumber,
//       datetime_start: tx.DateTimeStart,
//       datetime_end: tx.DateTimeEnd
//     }));

//     await transactionModel.insertMany(formattedTransactions);

//     logger.info(`✅ Received and inserted ${formattedTransactions.length} transaction(s) for ${EwuraLicenseNo}`);

//     return res.status(200).json({
//       message: '✅ Transactions received and inserted',
//       inserted: formattedTransactions.length
//     });
//   } catch (error) {
//     logger.error('❌ Error receiving transaction:', error);
//     res.status(500).json({ message: '❌ Failed to receive transaction', error: error.message });
//   }
// };


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
