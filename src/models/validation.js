import { validationResult, body, param, query } from 'express-validator';
import { ApiResponse } from '../views/ApiResponse.js';

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.validationError(res, errors.array());
  }
  next();
};

// Auth validation rules
export const validateRegister = [
  body('deviceSerial')
    .isLength({ min: 5, max: 100 })
    .withMessage('Device serial is required (5-100 characters)')
    .matches(/^[A-Z0-9\-_]+$/)
    .withMessage('Device serial can only contain uppercase letters, numbers, hyphens, and underscores'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email format required'),
  body('username').isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('roleCode').optional().isIn(['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER']).withMessage('Invalid role'),
  body('stationId').custom((value, { req }) => {
    const roleCode = req.body.roleCode;
    
    // ADMIN doesn't need station
    if (roleCode === 'ADMIN') {
      return true;
    }
    
    // All other roles (MANAGER, OPERATOR, VIEWER) need station
    if (!value) {
      throw new Error('Station selection is required for this role');
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new Error('Valid station ID must be provided');
    }
    
    return true;
  }),
  handleValidationErrors
];

export const validateLogin = [
  body('deviceSerial')
    .isLength({ min: 5, max: 100 })
    .withMessage('Device serial is required (5-100 characters)')
    .matches(/^[A-Z0-9\-_]+$/)
    .withMessage('Device serial format is invalid'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

export const validateCreateUser = [
  body('deviceSerial')
    .isLength({ min: 5, max: 100 })
    .withMessage('Device serial is required (5-100 characters)')
    .matches(/^[A-Z0-9\-_]+$/)
    .withMessage('Device serial can only contain uppercase letters, numbers, hyphens, and underscores'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email format required'),
  body('username').optional().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('roleCode').optional().isIn(['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER']).withMessage('Invalid role code'),
  body('stationId').custom((value, { req }) => {
    const roleCode = req.body.roleCode;
    
    // ADMIN doesn't need station
    if (roleCode === 'ADMIN') {
      return true;
    }
    
    // All other roles (MANAGER, OPERATOR, VIEWER) need station
    if (!value) {
      throw new Error('Station selection is required for this role');
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new Error('Valid station ID must be provided');
    }
    
    return true;
  }),
  body('interfaceTypeId').optional().isUUID().withMessage('Valid interface type ID required'),
  handleValidationErrors
];

export const validateUpdateUser = [
  body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email format required'),
  body('username').optional().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
  body('roleCode').optional().isIn(['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER']).withMessage('Invalid role code'),
  body('stationId').optional().isUUID().withMessage('Valid station ID required'),
  body('interfaceTypeId').optional().isUUID().withMessage('Valid interface type ID required'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  handleValidationErrors
];

// Station validation rules
export const validateCreateStation = [
  body('code').notEmpty().isLength({ min: 3, max: 20 }).withMessage('Station code is required (3-20 chars)'),
  body('name').notEmpty().isLength({ min: 3, max: 200 }).withMessage('Station name is required (3-200 chars)'),
  body('taxpayerId').isUUID().withMessage('Valid taxpayer ID is required'),
  body('wardId').isUUID().withMessage('Valid ward ID is required'),
  body('ewuraLicenseNo').optional().isLength({ max: 50 }).withMessage('EWURA license number too long'),
  handleValidationErrors
];

export const validateUpdateStation = [
  body('name').optional().isLength({ min: 3, max: 200 }).withMessage('Station name must be 3-200 characters'),
  body('taxpayerId').optional().isUUID().withMessage('Valid taxpayer ID required'),
  body('wardId').optional().isUUID().withMessage('Valid ward ID required'),
  body('ewuraLicenseNo').optional().isLength({ max: 50 }).withMessage('EWURA license number too long'),
  handleValidationErrors
];

// Tank validation rules
export const validateCreateTank = [
  body('stationId').isUUID().withMessage('Valid station ID is required'),
  body('tankNumber').notEmpty().isLength({ min: 1, max: 10 }).withMessage('Tank number is required'),
  body('productId').optional().isUUID().withMessage('Valid product ID required'),
  body('capacity').isFloat({ min: 0 }).withMessage('Capacity must be a positive number'),
  body('safeLevel').optional().isFloat({ min: 0 }).withMessage('Safe level must be positive'),
  body('criticalLevel').optional().isFloat({ min: 0 }).withMessage('Critical level must be positive'),
  handleValidationErrors
];

// Product validation rules
export const validateCreateProduct = [
  body('code').notEmpty().isLength({ min: 2, max: 20 }).withMessage('Product code is required (2-20 chars)'),
  body('name').notEmpty().isLength({ min: 2, max: 100 }).withMessage('Product name is required (2-100 chars)'),
  body('category').optional().isLength({ max: 50 }).withMessage('Category too long'),
  body('color').optional().isHexColor().withMessage('Color must be valid hex color'),
  handleValidationErrors
];

// EWURA validation rules
export const validateStationRegistration = [
  body('tranId').notEmpty().withMessage('Transaction ID is required'),
  body('apiSourceId').notEmpty().withMessage('API Source ID is required'),
  body('retailStationName').notEmpty().withMessage('Retail station name is required'),
  body('ewuraLicenseNo').notEmpty().withMessage('EWURA license number is required'),
  body('operatorTin').notEmpty().withMessage('Operator TIN is required'),
  body('operatorVrn').notEmpty().withMessage('Operator VRN is required'),
  body('operatorName').notEmpty().withMessage('Operator name is required'),
  body('regionName').notEmpty().withMessage('Region name is required'),
  body('districtName').notEmpty().withMessage('District name is required'),
  body('wardName').notEmpty().withMessage('Ward name is required'),
  body('zone').notEmpty().withMessage('Zone is required'),
  body('contactPersonEmailAddress').isEmail().withMessage('Valid email is required'),
  body('contactPersonPhone').notEmpty().withMessage('Contact phone is required'),
  handleValidationErrors
];

export const validateTransaction = [
  body('tranId').notEmpty().withMessage('Transaction ID is required'),
  body('apiSourceId').notEmpty().withMessage('API Source ID is required'),
  body('rctVerificationCode').notEmpty().withMessage('Receipt verification code is required'),
  body('ewuraLicenseNo').notEmpty().withMessage('EWURA license number is required'),
  body('rctDate').notEmpty().withMessage('Receipt date is required'),
  body('rctTime').notEmpty().withMessage('Receipt time is required'),
  body('operatorTin').notEmpty().withMessage('Operator TIN is required'),
  body('productName').notEmpty().withMessage('Product name is required'),
  body('unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be positive'),
  body('volume').isFloat({ min: 0 }).withMessage('Volume must be positive'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
  handleValidationErrors
];

export const validateDailySummary = [
  body('stationId').isUUID().withMessage('Valid station ID is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('tranId').notEmpty().withMessage('Transaction ID is required'),
  body('apiSourceId').notEmpty().withMessage('API Source ID is required'),
  body('ewuraLicenseNo').notEmpty().withMessage('EWURA license number is required'),
  body('retailStationName').notEmpty().withMessage('Retail station name is required'),
  body('countOfTransactions').isInt({ min: 0 }).withMessage('Count of transactions must be non-negative'),
  body('totalAmount').isFloat({ min: 0 }).withMessage('Total amount must be non-negative'),
  body('tankInventory').isArray().withMessage('Tank inventory must be an array'),
  handleValidationErrors
];

// Parameter validation
export const validateUUID = (paramName) => [
  param(paramName).isUUID().withMessage(`${paramName} must be a valid UUID`),
  handleValidationErrors
];

// Query validation
export const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sortBy').optional().isLength({ min: 1, max: 50 }).withMessage('Sort field too long'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  handleValidationErrors
];

export const validateDateRange = [
  query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be valid ISO 8601 date'),
  handleValidationErrors
];