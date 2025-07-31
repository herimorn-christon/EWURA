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
    .matches(/^\d{2}[A-Z]{2}\d{6}$/i)
    .withMessage('Device serial must be in the format: 2 digits, 2 letters, 6 digits (e.g., 02TZ994528)'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email format required'),
  body('username').optional().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('roleCode').optional().isIn(['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER']).withMessage('Invalid role'),
  body('stationId').custom((value, { req }) => {
    const role = req.body.roleCode;
    if (role === 'ADMIN') return true;
    if (!value) throw new Error('Station selection is required - valid station ID must be provided');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) throw new Error('Station selection is required - valid station ID must be provided');
    return true;
  }),
  body('interfaceTypeId').optional().isUUID().withMessage('Valid interface type ID required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  handleValidationErrors
];

export const validateLogin = [
  body('deviceSerial')
    .matches(/^\d{2}[A-Z]{2}\d{6}$/i)
    .withMessage('Device serial must be in the format: 2 digits, 2 letters, 6 digits (e.g., 02TZ994528)'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

// User validation rules
export const validateCreateUser = [
  body('deviceSerial')
    .matches(/^\d{2}[A-Z]{2}\d{6}$/i)
    .withMessage('Device serial must be in the format: 2 digits, 2 letters, 6 digits (e.g., 02TZ994528)'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email format required'),
  body('username').optional().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('roleCode').optional().isIn(['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER']).withMessage('Invalid role code'),
  body('stationId').custom((value, { req }) => {
    const role = req.body.roleCode;
    if (role === 'ADMIN') return true;
    if (!value) throw new Error('Station selection is required for this role');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) throw new Error('Valid station ID must be provided');
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
  body('streetId').custom((value) => {
    if (!value) throw new Error('Street ID is required');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) throw new Error('Valid street ID is required');
    return true;
  }),
  body('ewuraLicenseNo').optional().isLength({ max: 50 }).withMessage('EWURA license number too long'),
  handleValidationErrors
];

export const validateUpdateStation = [
  body('name').optional().isLength({ min: 3, max: 200 }).withMessage('Station name must be 3-200 characters'),
  body('taxpayerId').optional().isUUID().withMessage('Valid taxpayer ID required'),
  body('streetId').optional().custom((value) => {
    if (value) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) throw new Error('Valid street ID required');
    }
    return true;
  }),
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

// Region validation rules
export const validateCreateRegion = [
  body('name')
    .notEmpty().withMessage('Region name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Region name must be 2-100 characters'),
  body('code')
    .notEmpty().withMessage('Region code is required')
    .isLength({ min: 2, max: 10 }).withMessage('Region code must be 2-10 characters'),
  body('countryId')
    .isUUID().withMessage('Valid country ID is required'),
  handleValidationErrors
];

export const validateUpdateRegion = [
  body('name').optional()
    .isLength({ min: 2, max: 100 }).withMessage('Region name must be 2-100 characters'),
  body('code').optional()
    .isLength({ min: 2, max: 10 }).withMessage('Region code must be 2-10 characters'),
  body('countryId').optional()
    .isUUID().withMessage('Valid country ID required'),
  handleValidationErrors
];

// District validation rules
export const validateCreateDistrict = [
  body('name')
    .notEmpty().withMessage('District name is required')
    .isLength({ min: 2, max: 100 }).withMessage('District name must be 2-100 characters'),
  body('code')
    .notEmpty().withMessage('District code is required')
    .isLength({ min: 2, max: 10 }).withMessage('District code must be 2-10 characters'),
  body('regionId')
    .isUUID().withMessage('Valid region ID is required'),
  handleValidationErrors
];

export const validateUpdateDistrict = [
  body('name').optional()
    .isLength({ min: 2, max: 100 }).withMessage('District name must be 2-100 characters'),
  body('code').optional()
    .isLength({ min: 2, max: 10 }).withMessage('District code must be 2-10 characters'),
  body('regionId').optional()
    .isUUID().withMessage('Valid region ID required'),
  handleValidationErrors
];

// Ward validation rules
export const validateCreateWard = [
  body('name')
    .notEmpty().withMessage('Ward name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Ward name must be 2-100 characters'),
  body('code')
    .notEmpty().withMessage('Ward code is required')
    .isLength({ min: 2, max: 10 }).withMessage('Ward code must be 2-10 characters'),
  body('districtId')
    .isUUID().withMessage('Valid district ID is required'),
  handleValidationErrors
];

export const validateUpdateWard = [
  body('name').optional()
    .isLength({ min: 2, max: 100 }).withMessage('Ward name must be 2-100 characters'),
  body('code').optional()
    .isLength({ min: 2, max: 10 }).withMessage('Ward code must be 2-10 characters'),
  body('districtId').optional()
    .isUUID().withMessage('Valid district ID required'),
  handleValidationErrors
];

export const validateUpdateCountry = [
  body('name').optional()
    .isLength({ min: 2, max: 100 }).withMessage('Country name must be 2-100 characters'),
  body('code').optional()
    .isLength({ min: 2, max: 10 }).withMessage('Country code must be 2-10 characters'),
  handleValidationErrors
];

// Taxpayer validation rules
export const validateCreateTaxpayer = [
  body('tin')
    .notEmpty().withMessage('TIN is required')
    .isLength({ min: 9, max: 20 }).withMessage('TIN must be 9-20 characters')
    .matches(/^[0-9]+$/).withMessage('TIN must contain only numbers'),
  body('businessName')
    .notEmpty().withMessage('Business name is required')
    .isLength({ min: 2, max: 200 }).withMessage('Business name must be 2-200 characters'),
  body('streetId').custom((value) => {
    if (!value) throw new Error('Street ID is required');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) throw new Error('Valid street ID is required');
    return true;
  }),
  body('vrn').optional()
    .isLength({ min: 8, max: 20 }).withMessage('VRN must be 8-20 characters'),
  body('tradeName').optional()
    .isLength({ min: 2, max: 200 }).withMessage('Trade name must be 2-200 characters'),
  body('businessType').optional()
    .isIn(['RETAIL_FUEL', 'WHOLESALE_FUEL', 'TRANSPORT', 'MANUFACTURING', 'SERVICES', 'OTHER'])
    .withMessage('Invalid business type'),
  body('address').optional()
    .isLength({ max: 500 }).withMessage('Address too long'),
  body('phone').optional()
    .isMobilePhone().withMessage('Valid phone number required'),
  body('email').optional()
    .isEmail().normalizeEmail().withMessage('Valid email format required'),
  handleValidationErrors
];

export const validateUpdateTaxpayer = [
  body('businessName').optional()
    .isLength({ min: 2, max: 200 }).withMessage('Business name must be 2-200 characters'),
  body('streetId').optional().custom((value) => {
    if (value) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) throw new Error('Valid street ID required');
    }
    return true;
  }),
  body('vrn').optional()
    .isLength({ min: 8, max: 20 }).withMessage('VRN must be 8-20 characters'),
  body('tradeName').optional()
    .isLength({ min: 2, max: 200 }).withMessage('Trade name must be 2-200 characters'),
  body('businessType').optional()
    .isIn(['RETAIL_FUEL', 'WHOLESALE_FUEL', 'TRANSPORT', 'MANUFACTURING', 'SERVICES', 'OTHER'])
    .withMessage('Invalid business type'),
  body('address').optional()
    .isLength({ max: 500 }).withMessage('Address too long'),
  body('phone').optional()
    .isMobilePhone().withMessage('Valid phone number required'),
  body('email').optional()
    .isEmail().normalizeEmail().withMessage('Valid email format required'),
  body('isActive').optional()
    .isBoolean().withMessage('isActive must be a boolean'),
  handleValidationErrors
];

export const validateCreateCountry = [
  body('name')
    .notEmpty().withMessage('Country name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Country name must be 2-100 characters'),
  body('code')
    .notEmpty().withMessage('Country code is required')
    .isLength({ min: 2, max: 10 }).withMessage('Country code must be 2-10 characters'),
  handleValidationErrors
];

// Street validation rules
export const validateCreateStreet = [
  body('name')
    .notEmpty().withMessage('Street name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Street name must be 2-100 characters'),
  body('code')
    .notEmpty().withMessage('Street code is required')
    .isLength({ min: 2, max: 10 }).withMessage('Street code must be 2-10 characters'),
  body('wardId')
    .isUUID().withMessage('Valid ward ID is required'),
  handleValidationErrors
];

export const validateUpdateStreet = [
  body('name').optional()
    .isLength({ min: 2, max: 100 }).withMessage('Street name must be 2-100 characters'),
  body('code').optional()
    .isLength({ min: 2, max: 10 }).withMessage('Street code must be 2-10 characters'),
  body('wardId').optional()
    .isUUID().withMessage('Valid ward ID required'),
  handleValidationErrors
];