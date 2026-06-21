const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// m_registration_otp - registrasi merchant yang masih pending verifikasi OTP.
// OTP_HASH: hash bcrypt dari kode OTP (tidak menyimpan plaintext).
// PAYLOAD: JSON data pendaftaran sementara (owner, toko, username, password_hash, dll).
const RegistrationOtp = sequelize.define('m_registration_otp', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  EMAIL: { type: DataTypes.STRING(150) },
  PHONE: { type: DataTypes.STRING(30) },
  OTP_HASH: { type: DataTypes.STRING(100) },
  PAYLOAD: { type: DataTypes.TEXT },
  EXPIRES_AT: { type: DataTypes.DATE },
  LAST_SENT_AT: { type: DataTypes.DATE },
  ATTEMPTS: { type: DataTypes.INTEGER, defaultValue: 0 },
  VERIFIED: { type: DataTypes.BOOLEAN, defaultValue: false },
  CREATED_AT: { type: DataTypes.DATE },
  UPDATED_AT: { type: DataTypes.DATE },
}, {
  tableName: 'm_registration_otp',
  timestamps: true,
  createdAt: 'CREATED_AT',
  updatedAt: 'UPDATED_AT',
});

module.exports = RegistrationOtp;
