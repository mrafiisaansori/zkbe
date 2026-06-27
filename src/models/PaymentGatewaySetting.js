const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// m_payment_gateway_setting - pengaturan payment gateway per merchant.
// Untuk plan BUSINESS. Satu baris per merchant (di-scope otomatis via hook tenant).
// Kredensial Midtrans defaultnya diambil dari ENV backend (global sandbox/demo).
// Kolom *_KEY di sini OPSIONAL untuk merchant yang punya akun Midtrans sendiri;
// JANGAN simpan/return SERVER_KEY ke frontend.
const PaymentGatewaySetting = sequelize.define('m_payment_gateway_setting', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  PROVIDER: { type: DataTypes.STRING(20), defaultValue: 'midtrans' }, // 'midtrans'
  IS_ACTIVE: { type: DataTypes.BOOLEAN, defaultValue: false },        // aktifkan QRIS Midtrans
  // Override kredensial per merchant (opsional). Kosong = pakai ENV global.
  MIDTRANS_MERCHANT_ID: { type: DataTypes.STRING(50) },
  MIDTRANS_CLIENT_KEY: { type: DataTypes.STRING(100) },
  MIDTRANS_SERVER_KEY: { type: DataTypes.STRING(100) }, // disimpan terenkripsi/aman di server saja
  IS_PRODUCTION: { type: DataTypes.BOOLEAN, defaultValue: false },
  MERCHANT_ID: { type: DataTypes.INTEGER },
  CREATED_AT: { type: DataTypes.DATE },
  UPDATED_AT: { type: DataTypes.DATE },
}, {
  tableName: 'm_payment_gateway_setting',
  timestamps: true,
  createdAt: 'CREATED_AT',
  updatedAt: 'UPDATED_AT',
});

module.exports = PaymentGatewaySetting;
