console.log('>>> server.js entry point');

import dotenv from 'dotenv';
dotenv.config();

console.log('✅ Environment config loaded');

// Wrap imports in try-catch to identify failing imports
let express, helmet, cors, compression, rateLimit, createServer, Server, swaggerJsdoc, swaggerUi;
let logger, corsConfig, rateLimitConfig, swaggerOptions;
let dbManager, RedisManager, socketService, nfppService, npgisService, EWURAService;
let interfaceManager;
let authRoutes, userRoutes, stationRoutes, tankRoutes, productRoutes, reportRoutes,
    ewuraRoutes, analyticsRoutes, locationRoutes, taxpayerRoutes, transactionRoutes,
    interfaceRoutes, interfaceTypeRoutes; // <-- added interfaceRoutes here
let errorHandler, notFoundHandler, requestLogger, healthCheck;
let startBackupScheduler, stopBackupScheduler; // 👈 add this
let settingsRoutes; // 👈 add settingsRoutes
// after loading scheduler module:
let loadSystemSettings, toBackupSchedulerConfig;

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
  
  const socketServiceModule = await import('./services/SocketService.js');
  socketService = socketServiceModule.socketService;
  console.log('✅ Socket service loaded');
  
  // Load interface services
  const nfppServiceModule = await import('./services/NFPPService.js');
  nfppService = nfppServiceModule.nfppService;
  console.log('✅ NFPP service loaded');
  
  const npgisServiceModule = await import('./services/NPGISService.js');
  npgisService = npgisServiceModule.npgisService;
  console.log('✅ NPGIS service loaded');
  
  // Load interface manager
  const interfaceManagerModule = await import('./services/InterfaceManager.js');
  interfaceManager = interfaceManagerModule.interfaceManager; // assign to outer var (was const)
  console.log('✅ Interface manager loaded');
  
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
  console.log('🔄 Loading scheduler module...');
  const backupSchedulerModule = await import('./services/backupScheduler.js');
  startBackupScheduler = backupSchedulerModule.startBackupScheduler;
  stopBackupScheduler = backupSchedulerModule.stopBackupScheduler;
  console.log('✅ Backup scheduler module loaded');
} catch (error) {
  console.error('❌ Error loading scheduler module:', error);
  process.exit(1);
}
try {
  const settingsSvc = await import('./services/settingsService.js');
  loadSystemSettings = settingsSvc.loadSystemSettings;
  toBackupSchedulerConfig = settingsSvc.toBackupSchedulerConfig;
  console.log('✅ Settings service loaded');
} catch (e) {
  console.error('❌ Error loading settings service:', e);
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
  settingsRoutes = (await import('./routes/settingsRoutes.js')).default;
console.log('✅ Settings routes loaded');

  tankRoutes = (await import('./routes/tankRoutes.js')).default;
  console.log('✅ Tank routes loaded');
  
  const interfaceRoutesModule = await import('./routes/interfaceRoutes.js');
  interfaceRoutes = interfaceRoutesModule.default; // <-- assign to outer var
  console.log('✅ Interface routes loaded');
  
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
  // Backup routes
const backupRoutes = (await import('./routes/backupRoutes.js')).default;
console.log('✅ Backup routes loaded');

  
  taxpayerRoutes = (await import('./routes/taxpayerRoutes.js')).default;
  console.log('✅ Taxpayer routes loaded');

  // New: import transactions and interface-types routes (avoid undefined Router.use errors)
  transactionRoutes = (await import('./routes/transactionRoutes.js')).default;
  console.log('✅ Transaction routes loaded');

  interfaceTypeRoutes = (await import('./routes/interfaceTypeRoutes.js')).default;
  console.log('✅ Interface type routes loaded');

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
async function setupRoutes() {
  console.log('🛣️ Setting up routes...');

  // API Documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Gas Station API Documentation'
  }));

  // Health check endpoint
  app.get('/health', healthCheck);

  // helper to safely register routes
  const registerRoute = (prefix, routeModule) => {
    if (!routeModule) {
      console.warn(`⚠️ Skipping route registration for ${prefix} — module is undefined`);
      return;
    }
    if (typeof routeModule === 'function' || routeModule?.stack) {
      app.use(prefix, routeModule);
      console.log(`✅ Registered route ${prefix}`);
    } else {
      console.warn(`⚠️ Route module for ${prefix} is not a valid Express router/middleware`);
    }
  };

  // Static imports
  registerRoute('/api/auth', authRoutes);
  registerRoute('/api/users', userRoutes);
  registerRoute('/api/stations', stationRoutes);
  registerRoute('/api/tanks', tankRoutes);
  registerRoute('/api/interface', interfaceRoutes);
  registerRoute('/api/products', productRoutes);
  registerRoute('/api/ewura', ewuraRoutes);
  registerRoute('/api/reports', reportRoutes);
  registerRoute('/api/analytics', analyticsRoutes);
  registerRoute('/api/taxpayers', taxpayerRoutes);
  registerRoute('/api/transactions', transactionRoutes);
  registerRoute('/api/interface-types', interfaceTypeRoutes);
  registerRoute('/api/settings', settingsRoutes);


  // Dynamic imports
  const { default: backupRoutes } = await import('./routes/backupRoutes.js');
  registerRoute('/api/backup', backupRoutes);

  const { default: locationRoutes } = await import('./routes/locationRoutes.js');
  registerRoute('/api/locations', locationRoutes);

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
  logger.info('🔄 Initializing services...');

  try {
    // Initialize database
    logger.info('🔄 Initializing database...');
    await dbManager.initialize();
    logger.info('✅ Database initialized');
    
    // Initialize Redis
    logger.info('🔄 Initializing Redis...');
    await RedisManager.initialize();
    logger.info('✅ Redis initialized');
    
    // Initialize interface manager
    logger.info('🔄 Initializing Interface Manager...');
    await interfaceManager.initialize();
    await interfaceManager.initializeServices();
    logger.info('✅ Interface Manager initialized');
    
    // Initialize NFPP service
    logger.info('🔄 Starting NFPP monitoring...');
    try {
      await nfppService.startMonitoring();
      logger.info('✅ NFPP monitoring started');
    } catch (nfppError) {
      logger.warn('⚠️ NFPP monitoring failed to start:', nfppError);
    }
    
    // Start NPGIS monitoring
    logger.info('🔄 Starting NPGIS monitoring...');
    try {
      await npgisService.startMonitoring();
      logger.info('✅ NPGIS monitoring started');
    } catch (npgisError) {
      logger.warn('⚠️ NPGIS monitoring failed to start:', npgisError);
    }

    logger.info('✅ All services initialized');
  } catch (error) {
    logger.error('❌ Critical service initialization failed:', { error });
    throw error;
  }
}

// // Start server
// async function startServer() {
//   try {
//     console.log('🚀 Starting Gas Station Management Server...');
    
//     await initializeServices();
//     configureMiddleware();
//     setupRoutes();
//     configureErrorHandling();
    
//     // Start server
//     server.listen(PORT, HOST, () => {
//       console.log('🎉 =================================');
//       console.log('🚀 Gas Station Management Server');
//       console.log('🎉 =================================');
//       console.log(`📡 Server running on: http://${HOST}:${PORT}`);
//       console.log(`📚 API Documentation: http://${HOST}:${PORT}/api-docs`);
//       console.log(`🏥 Health Check: http://${HOST}:${PORT}/health`);
//       console.log(`🔌 WebSocket Server: ws://${HOST}:${PORT}`);
//       console.log('🎉 =================================');
      
//       logger.info('🚀 Gas Station Management Server started successfully', {
//         port: PORT,
//         host: HOST,
//         environment: process.env.NODE_ENV || 'development',
//         nodeVersion: process.version
//       });
//     });
    
//   } catch (error) {
//     console.error('❌ Failed to start server:', error);
//     logger.error('❌ Server startup failed:', error);
//     process.exit(1);
//   }
// }


// Start server
async function startServer() {
  try {
    console.log('🚀 Starting Gas Station Management Server...');
    
    await initializeServices();
    configureMiddleware();
    await setupRoutes();     // ✅ await this so all routes are mounted
    configureErrorHandling();
     // 🔔 start auto-backup (runs every 1 minute)
       const sys = await loadSystemSettings();
       const cfg = toBackupSchedulerConfig(sys);
    if (startBackupScheduler) {
      startBackupScheduler(logger, cfg);
      console.log('🗓️ Auto-backup scheduler started (every 1 minute)');
    }
    
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
let _shuttingDown = false;

async function gracefulShutdown() {
  if (_shuttingDown) return; // prevent double-invoke
  _shuttingDown = true;

  const SHUTDOWN_TIMEOUT_MS = 20000; // 20s cap for whole shutdown

  console.log('🔄 Graceful shutdown initiated...');
  logger.info('🔄 Graceful shutdown initiated...');

  // 1) Stop cron/schedulers first so no new jobs start mid-shutdown
  try {
    if (typeof stopBackupScheduler === 'function') {
      stopBackupScheduler();
      console.log('✅ Backup scheduler stopped');
    }
  } catch (e) {
    console.warn('⚠️ Failed to stop backup scheduler:', e?.message || e);
  }

  // Helper: wrap callbacks into a timeout-capped promise
  const withTimeout = (p, label) =>
    Promise.race([
      p,
      new Promise((_, rej) =>
        setTimeout(() => rej(new Error(`${label} timed out`)), SHUTDOWN_TIMEOUT_MS)
      ),
    ]);

  try {
    // 2) Stop accepting new connections (Socket.io + HTTP server)
    if (io?.close) {
      await withTimeout(
        new Promise((res) => io.close(res)),
        'Socket.io close'
      );
      console.log('✅ Socket.io server closed');
    }

    await withTimeout(
      new Promise((res) => server.close(() => res())),
      'HTTP server close'
    );
    console.log('🔄 HTTP server closed');

    // 3) Stop background services (in order, best-effort)
    if (socketService?.stop) {
      await socketService.stop();
      console.log('✅ Socket service stopped');
    }

    if (interfaceManager?.stopAllMonitoring) {
      await interfaceManager.stopAllMonitoring();
      console.log('✅ Interface monitoring stopped');
    }

    if (nfppService?.stop) {
      await nfppService.stop();
      console.log('✅ NFPP service stopped');
    }

    if (npgisService?.stop) {
      await npgisService.stop();
      console.log('✅ NPGIS service stopped');
    }

    // 4) Close infra (cache/db) last
    if (RedisManager?.close) {
      await RedisManager.close();
      console.log('✅ Redis connection closed');
    }
    if (dbManager?.close) {
      await dbManager.close();
      console.log('✅ Database connection closed');
    }

    console.log('✅ All services stopped gracefully');
    logger.info('✅ Server shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
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