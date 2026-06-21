const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Buat token login. Payload memuat identitas + merchant + level.
function signToken(payload) {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, env.jwt.secret);
}

module.exports = { signToken, verifyToken };
