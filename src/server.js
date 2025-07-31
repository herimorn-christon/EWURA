console.log('>>> server.js entry point');

import dotenv from 'dotenv';
dotenv.config();

console.log('✅ Environment config loaded');

// Wrap imports in try-catch to identify failing imports
let express, helmet, cors, compression, rateLimit, createServer, Server, swaggerJsdoc, swaggerUi;
let logger, corsConfig, rateLimitConfig, swaggerOptions;
let dbManager, RedisManager, ATGService, SocketService, EWURAService;
let authRoutes, userRoutes, stationRoutes, tankRoutes, productRoutes, reportRoutes, ewuraRoutes, analyticsRoutes, locationRoutes, taxpayerRoutes;
let errorHandler, notFoundHandler, requestLogger, healthCheck;

try {
  console.log('🔄 Loading basic dependencies...');
  express = (await import('express')).default;
  console.log('✅ Express loaded');
  
  helmet = (await import('helmet')).default;
  console.log('✅ Helmet loaded');
  
  cors = (await import('cors')).default;
  console.log('✅ CORS loaded');
  
  compression = (await import('compression')).default;
  console.log('✅ Compression loaded');
  
  rateLimit = (await import('express-rate-limit')).default;
  console.log('✅ Rate limit loaded');
  
  const httpModule = await import('http');
  createServer = httpModule.createServer;
  console.log('✅ HTTP server loaded');
  
  const socketModule = await import('socket.io');
  Server = socketModule.Server;
  console.log('✅ Socket.io loaded');
  
  swaggerJsdoc = (await import('swagger-jsdoc')).default;
  console.log('✅ Swagger JSDoc loaded');
  
  swaggerUi = (await import('swagger-ui-express')).default;
  console.log('✅ Swagger UI loaded');
  
} catch (error) {
  console.error('❌ Error loading basic dependencies:', error);
  process.exit(1);
}

try {
  console.log('🔄 Loading utility modules...');
  const loggerModule = await import('./utils/logger.js');
  logger = loggerModule.logger;
  console.log('✅ Logger loaded');
  
  const corsConfigModule = await import('./config/cors.js');
  corsConfig = corsConfigModule.corsConfig;
  console.log('✅ CORS config loaded');
  
  const rateLimitConfigModule = await import('./config/rateLimit.js');
  rateLimitConfig = rateLimitConfigModule.rateLimitConfig;
  console.log('✅ Rate limit config loaded');
  
  const swaggerOptionsModule = await import('./config/swagger.js');
  swaggerOptions = swaggerOptionsModule.swaggerOptions;
  console.log('✅ Swagger options loaded');
  
} catch (error) {
  console.error('❌ Error loading utility modules:', error);
  process.exit(1);
}

try {
  console.log('🔄 Loading service modules...');
  const dbManagerModule = await import('./database/DatabaseManager.js');
  dbManager = dbManagerModule.dbManager;
  console.log('✅ Database manager loaded');
  
  const redisManagerModule = await import('./cache/RedisManager.js');
  RedisManager = redisManagerModule.RedisManager;
  console.log('✅ Redis manager loaded');
  
  const atgServiceModule = await import('./services/ATGService.js');
  ATGService = atgServiceModule.ATGService;
  console.log('✅ ATG service loaded');
  
  const socketServiceModule = await import('./services/SocketService.js');
  SocketService = socketServiceModule.SocketService;
  console.log('✅ Socket service loaded');
  
  const ewuraServiceModule = await import('./services/EWURAService.js');
  EWURAService = ewuraServiceModule.EWURAService;
  console.log('✅ EWURA service loaded');
  
} catch (error) {
  console.error('❌ Error loading service modules:', error);
  process.exit(1);
}

try {
  console.log('🔄 Loading middleware modules...');
  const errorHandlerModule = await import('./middleware/errorHandler.js');
  errorHandler = errorHandlerModule.errorHandler;
  notFoundHandler = errorHandlerModule.notFoundHandler;
  console.log('✅ Error handlers loaded');
  
  const requestLoggerModule = await import('./middleware/requestLogger.js');
  requestLogger = requestLoggerModule.requestLogger;
  console.log('✅ Request logger loaded');
  
  const healthCheckModule = await import('./middleware/healthCheck.js');
  healthCheck = healthCheckModule.healthCheck;
  console.log('✅ Health check loaded');
  
} catch (error) {
  console.error('❌ Error loading middleware modules:', error);
  process.exit(1);
}

try {
  console.log('🔄 Loading route modules...');
  authRoutes = (await import('./routes/authRoutes.js')).default;
  console.log('✅ Auth routes loaded');
  
  userRoutes = (await import('./routes/userRoutes.js')).default;
  console.log('✅ User routes loaded');
  
  stationRoutes = (await import('./routes/stationRoutes.js')).default;
  console.log('✅ Station routes loaded');
  
  tankRoutes = (await import('./routes/tankRoutes.js')).default;
  console.log('✅ Tank routes loaded');
  
  productRoutes = (await import('./routes/productRoutes.js')).default;
  console.log('✅ Product routes loaded');
  
  reportRoutes = (await import('./routes/reportRoutes.js')).default;
  console.log('✅ Report routes loaded');
  
  ewuraRoutes = (await import('./routes/ewuraRoutes.js')).default;
  console.log('✅ EWURA routes loaded');
  
  analyticsRoutes = (await import('./routes/analyticsRoutes.js')).default;
  console.log('✅ Analytics routes loaded');
  
  locationRoutes = (await import('./routes/locationRoutes.js')).default;
  console.log('✅ Location routes loaded');
  
  taxpayerRoutes = (await import('./routes/taxpayerRoutes.js')).default;
  console.log('✅ Taxpayer routes loaded');
  
} catch (error) {
  console.error('❌ Error loading route modules:', error);
  process.exit(1);
}

console.log('🎉 All modules loaded successfully!');

// Initialize Express app
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

console.log('✅ Express app and Socket.io server created');

// Server configuration
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Swagger setup
const specs = swaggerJsdoc(swaggerOptions);

console.log('✅ Configuration setup complete');

// Configure middleware
function configureMiddleware() {
  console.log('🔧 Configuring middleware...');
  
  app.use(helmet());
  app.use(cors(corsConfig));
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(rateLimit(rateLimitConfig));
  app.use(requestLogger);
  
  console.log('✅ Middleware configured');
}

// Setup routes
function setupRoutes() {
  console.log('🛣️ Setting up routes...');
  
  // API Documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Gas Station API Documentation'
  }));

  // Health check endpoint
  app.get('/health', healthCheck);

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/stations', stationRoutes);
  app.use('/api/tanks', tankRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/ewura', ewuraRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/locations', locationRoutes);
  app.use('/api/taxpayers', taxpayerRoutes);

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'Gas Station Management API',
      version: '1.0.0',
      status: 'operational',
      documentation: '/api-docs',
      timestamp: new Date().toISOString()
    });
  });

  console.log('✅ Routes configured');
}

// Configure error handling
function configureErrorHandling() {
  console.log('⚠️ Configuring error handling...');
  
  // Error handling middleware (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);
  
  console.log('✅ Error handlers configured');
}

// Initialize services
async function initializeServices() {
  try {
    console.log('🔄 Initializing services...');
    
    // Initialize database
    console.log('🔄 Initializing database...');
    await dbManager.initialize();
    console.log('✅ Database initialized');
    
    // Initialize Redis
    console.log('🔄 Initializing Redis...');
    await RedisManager.initialize();
    console.log('✅ Redis initialized');
    
    // Initialize Socket service
    console.log('🔄 Initializing Socket service...');
    SocketService.initialize(io);
    console.log('✅ Socket service initialized');
    
    // Initialize ATG service
    console.log('🔄 Initializing ATG service...');
    await ATGService.initialize();
    console.log('✅ ATG service initialized');
    
    // Initialize EWURA service
    console.log('🔄 Initializing EWURA service...');
    await EWURAService.initialize();
    console.log('✅ EWURA service initialized');
    
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    logger.error('❌ Service initialization failed:', error);
    throw error;
  }
}

// Start server
async function startServer() {
  try {
    console.log('🚀 Starting Gas Station Management Server...');
    
    await initializeServices();
    configureMiddleware();
    setupRoutes();
    configureErrorHandling();
    
    // Start server
    server.listen(PORT, HOST, () => {
      console.log('🎉 =================================');
      console.log('🚀 Gas Station Management Server');
      console.log('🎉 =================================');
      console.log(`📡 Server running on: http://${HOST}:${PORT}`);
      console.log(`📚 API Documentation: http://${HOST}:${PORT}/api-docs`);
      console.log(`🏥 Health Check: http://${HOST}:${PORT}/health`);
      console.log(`🔌 WebSocket Server: ws://${HOST}:${PORT}`);
      console.log('🎉 =================================');
      
      logger.info('🚀 Gas Station Management Server started successfully', {
        port: PORT,
        host: HOST,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    logger.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
async function gracefulShutdown() {
  console.log('🔄 Graceful shutdown initiated...');
  logger.info('🔄 Graceful shutdown initiated...');
  
  server.close(async () => {
    console.log('🔄 HTTP server closed');
    
    try {
      await ATGService.stop();
      await RedisManager.close();
      await dbManager.close();
      console.log('✅ All services stopped gracefully');
      logger.info('✅ Server shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      logger.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('⏰ Forced shutdown after timeout');
    logger.error('⏰ Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

// Handle process signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  logger.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  logger.error('❌ Unhandled Rejection:', { reason, promise });
  process.exit(1);
});

console.log('🔄 Starting server...');
startServer();