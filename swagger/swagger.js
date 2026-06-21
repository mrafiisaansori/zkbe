const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'POS Backend API',
      version: '1.0.0',
      description: 'POS Backend API',
    },
    servers: [{ url: '/api', description: 'Base path API' }],
    components: {
      securitySchemes: {
        basicAuth: { type: 'http', scheme: 'basic' },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object', nullable: true },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            details: { type: 'array', items: { type: 'string' }, nullable: true },
          },
        },
      },
    },
    security: [{ basicAuth: [] }],
  },
  // Gunakan forward slash agar glob bekerja di Windows (backslash dianggap escape).
  apis: [path.join(__dirname, '../src/routes/*.js').replace(/\\/g, '/')],
};

module.exports = swaggerJsdoc(options);
