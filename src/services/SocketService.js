import express from 'express';
import { logger } from '../utils/logger.js';
import { Server } from 'socket.io';

// Define supported interface types
const INTERFACE_TYPES = {
  NFPP: 'NFPP',     // National Fuel Price Platform Interface
  NPGIS: 'NPGIS',   // National Petroleum GIS Interface
  ALL: 'ALL'        // For clients wanting all events
};

export class SocketService {
  constructor() {
    this.app = express();
    this.server = null;
    this.sseClients = new Map(); // Map of interface type to Set of clients
    this.isInitialized = false;
    this.io = null;
    this.connectedClients = new Map();
    this.monitoringSessions = new Map();
  }

  async initialize() {
    try {
      if (this.isInitialized) {
        logger.warn('Socket service already initialized');
        return;
      }

      // Setup SSE endpoints
      this.setupSSE();

      // Start server
      const port = process.env.SSE_PORT || 8080;
      this.server = this.app.listen(port, () => {
        logger.info(`✅ SSE server running on port ${port}`);
        logger.info('📡 Supported interfaces: EFPP, NPGIS');
      });

      this.isInitialized = true;
      logger.info('✅ Socket service initialized');
    } catch (error) {
      logger.error('❌ Socket service initialization failed:', error);
      throw error;
    }
  }

  setupSSE() {
    // SSE endpoint with interface type parameter
    this.app.get('/stream/:interfaceType?', (req, res) => {
      const requestedType = req.params.interfaceType?.toUpperCase();
      const interfaceType = Object.values(INTERFACE_TYPES).includes(requestedType) 
        ? requestedType 
        : INTERFACE_TYPES.ALL;

      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      res.write('retry: 5000\n\n');

      // Initialize client set for interface type if needed
      if (!this.sseClients.has(interfaceType)) {
        this.sseClients.set(interfaceType, new Set());
      }

      // Store client connection
      this.sseClients.get(interfaceType).add(res);
      logger.info(`New client connected to ${interfaceType} stream`);

      // Remove client on disconnect
      req.on('close', () => {
        this.sseClients.get(interfaceType).delete(res);
        if (this.sseClients.get(interfaceType).size === 0) {
          this.sseClients.delete(interfaceType);
        }
        logger.debug(`Client disconnected from ${interfaceType} stream`);
      });
    });
  }

  /**
   * Emit event to specific interface clients
   */
  emitToInterface(interfaceType, eventName, data) {
    if (!this.isInitialized) {
      logger.warn('Socket service not initialized');
      return;
    }

    // Check if interfaceType is an object with interfaceCode
    const type = typeof interfaceType === 'object' ? 
      interfaceType.interfaceCode : 
      interfaceType;

    const validType = Object.values(INTERFACE_TYPES).includes(String(type).toUpperCase()) 
      ? String(type).toUpperCase() 
      : null;

    if (!validType) {
      logger.error(`Invalid interface type: ${type}`);
      return;
    }

    const message = `event: ${eventName}\ndata: ${JSON.stringify({
      interface: validType,
      timestamp: new Date().toISOString(),
      ...(typeof data === 'object' ? data : { data })
    })}\n\n`;

    // Send to specific interface clients
    if (this.sseClients.has(validType)) {
      this.sseClients.get(validType).forEach(client => {
        try {
          client.write(message);
          logger.debug(`Emitted ${eventName} to ${validType} client`);
        } catch (error) {
          logger.error(`SSE send failed for ${validType}:`, error);
          this.sseClients.get(validType).delete(client);
        }
      });
    }

    // Also send to 'ALL' subscribers
    if (this.sseClients.has(INTERFACE_TYPES.ALL)) {
      this.sseClients.get(INTERFACE_TYPES.ALL).forEach(client => {
        try {
          client.write(message);
          logger.debug(`Emitted ${eventName} to ALL client`);
        } catch (error) {
          logger.error('SSE send failed for ALL:', error);
          this.sseClients.get(INTERFACE_TYPES.ALL).delete(client);
        }
      });
    }
  }

  async stop() {
    if (this.server) {
      await new Promise(resolve => this.server.close(resolve));
    }
    this.sseClients.forEach((clients, type) => {
      clients.forEach(client => {
        try {
          client.end();
        } catch (error) {
          logger.error(`Error closing ${type} SSE client:`, error);
        }
      });
    });
    this.sseClients.clear();
    this.isInitialized = false;
    logger.info('✅ Socket service stopped');
  }

  initializeSocketIO(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "*",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.setupEventHandlers();
    logger.info('Socket.io service initialized');
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);
      
      // Store client connection
      this.connectedClients.set(socket.id, {
        socket,
        monitoring: new Set()
      });

      // Handle interface monitoring
      socket.on('startMonitoring', async (data) => {
        try {
          const { stationId, interfaceCode } = data;
          const clientData = this.connectedClients.get(socket.id);
          
          if (clientData) {
            clientData.monitoring.add(`${stationId}-${interfaceCode}`);
            this.monitoringSessions.set(`${stationId}-${interfaceCode}`, socket.id);
            
            // Emit success acknowledgment
            socket.emit('monitoringStarted', { stationId, interfaceCode });
            logger.info(`Monitoring started for station ${stationId} interface ${interfaceCode}`);
          }
        } catch (error) {
          logger.error('Error starting monitoring:', error);
          socket.emit('monitoringError', { error: error.message });
        }
      });

      socket.on('stopMonitoring', (data) => {
        try {
          const { stationId, interfaceCode } = data;
          const clientData = this.connectedClients.get(socket.id);
          
          if (clientData) {
            clientData.monitoring.delete(`${stationId}-${interfaceCode}`);
            this.monitoringSessions.delete(`${stationId}-${interfaceCode}`);
            
            socket.emit('monitoringStopped', { stationId, interfaceCode });
            logger.info(`Monitoring stopped for station ${stationId} interface ${interfaceCode}`);
          }
        } catch (error) {
          logger.error('Error stopping monitoring:', error);
          socket.emit('monitoringError', { error: error.message });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        const clientData = this.connectedClients.get(socket.id);
        if (clientData) {
          // Cleanup monitoring sessions
          clientData.monitoring.forEach(sessionKey => {
            this.monitoringSessions.delete(sessionKey);
          });
          this.connectedClients.delete(socket.id);
        }
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  // Method to emit interface updates to monitoring clients
  emitInterfaceUpdate(stationId, interfaceCode, data) {
    const sessionKey = `${stationId}-${interfaceCode}`;
    const clientId = this.monitoringSessions.get(sessionKey);
    
    if (clientId) {
      const clientData = this.connectedClients.get(clientId);
      if (clientData?.socket) {
        clientData.socket.emit('interfaceUpdate', {
          stationId,
          interfaceCode,
          ...data
        });
      }
    }
  }

  // Method to emit transaction updates
  emitTransactionUpdate(stationId, transaction) {
    this.io?.emit('newTransaction', {
      stationId,
      transaction
    });
  }

  // Method to emit tank level updates
  emitTankUpdate(stationId, tankData) {
    this.io?.emit('tankUpdate', {
      stationId,
      tankData
    });
  }

  // Clean shutdown
  async stop() {
    if (this.io) {
      const sockets = await this.io.fetchSockets();
      
      // Disconnect all clients
      for (const socket of sockets) {
        socket.disconnect(true);
      }
      
      this.connectedClients.clear();
      this.monitoringSessions.clear();
      
      this.io.close();
      this.io = null;
      
      logger.info('Socket service stopped');
    }
  }
}

// Export singleton instance
export const socketService = new SocketService();