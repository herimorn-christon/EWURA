import { logger } from '../utils/logger.js';
import { ApiResponse } from '../views/ApiResponse.js';

export const errorHandler = (error, req, res, next) => {
  logger.error('Unhandled error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    user: req.user?.id
  });

  // Database errors
  if (error.code === '23505') {
    return ApiResponse.error(res, 'Duplicate entry: Resource already exists', 409);
  }
  
  if (error.code === '23503') {
    return ApiResponse.error(res, 'Referenced resource does not exist', 400);
  }
  
  if (error.code === '23502') {
    return ApiResponse.error(res, 'Required field is missing', 400);
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    return ApiResponse.validationError(res, error.errors);
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return ApiResponse.unauthorized(res, 'Invalid token');
  }
  
  if (error.name === 'TokenExpiredError') {
    return ApiResponse.unauthorized(res, 'Token expired');
  }

  // File upload errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return ApiResponse.error(res, 'File too large', 413);
  }

  // Network errors
  if (error.code === 'ECONNREFUSED') {
    return ApiResponse.error(res, 'Service temporarily unavailable', 503);
  }

  // Default error
  const statusCode = error.statusCode || error.status || 500;
  const message = error.message || 'Internal server error';
  
  return ApiResponse.error(res, message, statusCode);
};

export const notFoundHandler = (req, res) => {
  return ApiResponse.notFound(res, `Route ${req.method} ${req.path} not found`);
};

export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};