import { logger } from '../utils/logger.js';

class SocketServiceClass {
  constructor() {
    this.io = null;
    this.connectedClients = new Map();
  }

  initialize(io) {
    this.io = io;
    
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);
      
      this.connectedClients.set(socket.id, {
        socket,
        connectedAt: new Date(),
        lastPing: new Date()
      });

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });

      socket.on('ping', () => {
        const client = this.connectedClients.get(socket.id);
        if (client) {
          client.lastPing = new Date();
          socket.emit('pong');
        }
      });

      socket.on('join-station', (stationId) => {
        socket.join(`station:${stationId}`);
        logger.debug(`Client ${socket.id} joined station: ${stationId}`);
      });

      socket.on('leave-station', (stationId) => {
        socket.leave(`station:${stationId}`);
        logger.debug(`Client ${socket.id} left station: ${stationId}`);
      });

      // Send initial connection status
      socket.emit('connected', {
        clientId: socket.id,
        timestamp: new Date().toISOString()
      });
    });

    logger.info('✅ Socket Service initialized');
  }

  emit(event, data) {
    if (this.io) {
      this.io.emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  }

  emitToStation(stationId, event, data) {
    if (this.io) {
      this.io.to(`station:${stationId}`).emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  }

  emitToClient(clientId, event, data) {
    if (this.io) {
      this.io.to(clientId).emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  }

  getConnectedClients() {
    return Array.from(this.connectedClients.values()).map(client => ({
      id: client.socket.id,
      connectedAt: client.connectedAt,
      lastPing: client.lastPing
    }));
  }

  getClientCount() {
    return this.connectedClients.size;
  }
}

export const SocketService = new SocketServiceClass();