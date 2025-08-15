// src/middleware/validateTransactionInput.js

export const validateTransactionInput = (req, res, next) => {
  const { EwuraLicenseNo, Transactions } = req.body;

  if (!EwuraLicenseNo) {
    return res.status(400).json({ message: '🚫 EwuraLicenseNo is required' });
  }

  if (!Array.isArray(Transactions) || Transactions.length === 0) {
    return res.status(400).json({ message: '🚫 Transactions array is missing or empty' });
  }

  const requiredFields = [
    'Pump', 'Nozzle', 'Volume', 'Price', 'Amount', 'Transaction',
    'DiscountAmount', 'TotalVolume', 'TotalAmount',
    'CustomerName', 'FuelGradeName', 'EfdSerialNumber',
    'DateTimeEnd', 'DateTimeStart'
  ];

  const invalidTransactions = [];

  Transactions.forEach((tx, index) => {
    const missingFields = requiredFields.filter(field => !(field in tx));
    if (missingFields.length > 0) {
      invalidTransactions.push({ index, missingFields });
    }
  });

  if (invalidTransactions.length > 0) {
    return res.status(400).json({
      message: '🚫 Some transactions have missing fields',
      details: invalidTransactions
    });
  }

  next();
};
