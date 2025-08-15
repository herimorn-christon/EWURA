// src/middleware/validateTransactionInput.js
export const validateTransactionInput = (req, res, next) => {
  const requiredFields = [
    'station_id', 'product_id', 'user_id',
    'transaction_date', 'transaction_time',
    'volume', 'unit_price', 'total_amount'
  ];

  const missing = requiredFields.filter(field => !req.body[field]);

  if (missing.length > 0) {
    return res.status(400).json({
      message: '🚫 Missing required fields',
      missing
    });
  }

  next();
};
