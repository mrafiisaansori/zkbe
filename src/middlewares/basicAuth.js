const basicAuth = require('express-basic-auth');
const env = require('../config/env');

// Basic Authentication melindungi seluruh API & Swagger.
// Credential default: admin / rahasia (dari .env).
module.exports = basicAuth({
  users: { [env.basicAuth.username]: env.basicAuth.password },
  challenge: true,
  realm: 'POS Backend',
  unauthorizedResponse: () => ({
    success: false,
    message: 'Unauthorized - Basic Auth diperlukan',
    details: null,
  }),
});
