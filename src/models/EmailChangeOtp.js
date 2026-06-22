const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// m_email_change_otp - permintaan ganti email akun/toko via OTP ke EMAIL BARU.
// Email baru hanya tersimpan setelah password benar (dicek saat request) DAN
// OTP valid (dicek saat verify). OTP_HASH = hash bcrypt (tidak simpan plaintext).
const EmailChangeOtp = sequelize.define('m_email_change_otp', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  MERCHANT_ID: { type: DataTypes.INTEGER },
  ID_USER: { type: DataTypes.INTEGER },
  NEW_EMAIL: { type: DataTypes.STRING(150) },
  OTP_HASH: { type: DataTypes.STRING(100) },
  EXPIRES_AT: { type: DataTypes.DATE },
  LAST_SENT_AT: { type: DataTypes.DATE },
  ATTEMPTS: { type: DataTypes.INTEGER, defaultValue: 0 },
  USED: { type: DataTypes.BOOLEAN, defaultValue: false },
  CREATED_AT: { type: DataTypes.DATE },
  UPDATED_AT: { type: DataTypes.DATE },
}, {
  tableName: 'm_email_change_otp',
  timestamps: true,
  createdAt: 'CREATED_AT',
  updatedAt: 'UPDATED_AT',
});

module.exports = EmailChangeOtp;
