export const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Gas Station Management API',
      version: '1.0.0',
      description: 'Professional Gas Station Backend with EWURA Integration and ATG Monitoring',
      contact: {
        name: 'API Support',
        email: 'support@advafuel.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://api.advafuel.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            deviceSerial: { type: 'string', example: 'ADV-DEV-001' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'manager', 'operator', 'viewer'] },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Station: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            code: { type: 'string' },
            address: { type: 'string' },
            wardId: { type: 'string', format: 'uuid' },
            taxpayerId: { type: 'string', format: 'uuid' },
            isActive: { type: 'boolean' }
          }
        },
        Tank: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            tankNumber: { type: 'string' },
            stationId: { type: 'string', format: 'uuid' },
            productId: { type: 'string', format: 'uuid' },
            capacity: { type: 'number' },
            currentLevel: { type: 'number' },
            temperature: { type: 'number' },
            lastReading: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { 
              type: 'array',
              items: { type: 'string' }
            },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/server.js'
  ]
};