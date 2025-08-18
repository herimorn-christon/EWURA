import winston from 'winston';
import 'winston-daily-rotate-file';

const { format, transports } = winston;
const { combine, timestamp, printf, colorize } = format;

// Custom format for log messages
const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
  return `${timestamp} ${level}: ${message} ${metaStr}`;
});

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    // Console output with colors
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      )
    }),
    
    // Rotating file transport for errors
    new transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d'
    }),

    // Rotating file transport for all logs
    new transports.DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

// Add request context if needed
logger.requestContext = {};

// Helper methods
const loggerHelper = {
  info: (message, meta = {}) => {
    logger.info(message, { ...logger.requestContext, ...meta });
  },
  
  error: (message, error = null, meta = {}) => {
    const errorMeta = error ? {
      error: {
        message: error.message,
        stack: error.stack,
        ...error
      }
    } : {};
    logger.error(message, { ...logger.requestContext, ...errorMeta, ...meta });
  },
  
  warn: (message, meta = {}) => {
    logger.warn(message, { ...logger.requestContext, ...meta });
  },
  
  debug: (message, meta = {}) => {
    logger.debug(message, { ...logger.requestContext, ...meta });
  },

  // Set context for request scoped logging
  setRequestContext: (context) => {
    logger.requestContext = context;
  },

  // Clear request context
  clearRequestContext: () => {
    logger.requestContext = {};
  }
};

export { loggerHelper as logger };