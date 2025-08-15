import express from 'express';
import {
  receiveTransaction,
  getTransactions,
  getDailySales
} from '../controllers/transactionController.js';
import { validateTransactionInput } from '../middleware/validateTransactionInput.js';

const router = express.Router();

// POST /api/transactions
router.post('/', validateTransactionInput, receiveTransaction);

// GET /api/transactions?station_id=&date=&limit=
router.get('/', getTransactions);

// GET /api/transactions/daily-sales?station_id=xxx&date=yyyy-mm-dd
router.get('/daily-sales', getDailySales);

export default router;
