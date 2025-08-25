import express from 'express';
import { npgisService } from '../services/NPGISService.js';
import { validateTransactionInput } from '../middleware/validateTransactionInput.js';

const router = express.Router();

// POST /api/transactions
router.post('/', async (req, res) => {
  try {
    // Log the headers and body of the incoming request
    console.log('Received headers:', req.headers);
    console.log('Received body:', req.body);

    const { EwuraLicenseNo, Transactions } = req.body;
    const apiKey = req.headers['api-key']; // Extract the API key from headers

    if (!Transactions || !Array.isArray(Transactions)) {
      return res.status(400).json({ error: 'Invalid transactions format. Must be an array.' });
    }

    if (!EwuraLicenseNo) {
      return res.status(400).json({ error: 'EwuraLicenseNo is required.' });
    }

    // Pass the data to the service
    const result = await npgisService.receiveTransactionData(
      { transactions: Transactions, EwuraLicenseNo }, // Include EwuraLicenseNo in the payload
      null, // Station ID can be resolved in the service
      apiKey // Pass the API key
    );

    res.status(200).json({
      message: 'Transactions processed successfully',
      processedCount: result.count,
    });
  } catch (error) {
    console.error('Error processing transactions:', error);
    res.status(500).json({ error: 'Failed to process transactions' });
  }
});

// GET /api/transactions?station_id=&date=&limit=
router.get('/', async (req, res) => {
  try {
    const { station_id, date, limit } = req.query;

    const transactions = await npgisService.getTransactions(station_id, date, limit);

    res.status(200).json({
      message: 'Transactions retrieved successfully',
      transactions,
    });
  } catch (error) {
    console.error('Error retrieving transactions:', error);
    res.status(500).json({ error: 'Failed to retrieve transactions' });
  }
});

// GET /api/transactions/daily-sales?station_id=xxx&date=yyyy-mm-dd
router.get('/daily-sales', async (req, res) => {
  try {
    const { station_id, date } = req.query;

    const dailySales = await npgisService.getDailySales(station_id, date);

    res.status(200).json({
      message: 'Daily sales retrieved successfully',
      dailySales,
    });
  } catch (error) {
    console.error('Error retrieving daily sales:', error);
    res.status(500).json({ error: 'Failed to retrieve daily sales' });
  }
});

export default router;
