const bcrypt = require('bcryptjs');

// Buat kode OTP 6 digit (000000-999999).
function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Simpan OTP sebagai hash (jangan plaintext).
async function hashOtp(code) {
  return bcrypt.hash(String(code), 8);
}

async function verifyOtp(code, hash) {
  if (!hash) return false;
  return bcrypt.compare(String(code), hash);
}

module.exports = { generateOtp, hashOtp, verifyOtp };
