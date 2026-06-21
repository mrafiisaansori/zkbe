const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// m_password_reset_otp - permintaan reset password (lupa password) via OTP email.
// OTP_HASH: hash bcrypt dari kode OTP (tidak menyimpan plaintext).
// ID_USER : user (m_pengguna) yang meminta reset. Tidak membocorkan ke frontend.
const PasswordResetOtp = sequelize.define('m_password_reset_otp', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  EMAIL: { type: DataTypes.STRING(150) },
  ID_USER: { type: DataTypes.INTEGER },
  OTP_HASH: { type: DataTypes.STRING(100) },
  EXPIRES_AT: { type: DataTypes.DATE },
  LAST_SENT_AT: { type: DataTypes.DATE },
  ATTEMPTS: { type: DataTypes.INTEGER, defaultValue: 0 },
  USED: { type: DataTypes.BOOLEAN, defaultValue: false },
  CREATED_AT: { type: DataTypes.DATE },
  UPDATED_AT: { type: DataTypes.DATE },
}, {
  tableName: 'm_password_reset_otp',
  timestamps: true,
  createdAt: 'CREATED_AT',
  updatedAt: 'UPDATED_AT',
});

module.exports = PasswordResetOtp;
