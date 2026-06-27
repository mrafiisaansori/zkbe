const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// t_payment_webhook_log - menyimpan SETIAP payload notifikasi/webhook Midtrans
// untuk audit & debug. TIDAK di-scope tenant (webhook publik tanpa login);
// MERCHANT_ID diisi eksplisit dari hasil parse order_id setelah signature valid.
const PaymentWebhookLog = sequelize.define('t_payment_webhook_log', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  PROVIDER: { type: DataTypes.STRING(20), defaultValue: 'midtrans' },
  ORDER_ID: { type: DataTypes.STRING(100) },
  TRANSACTION_ID: { type: DataTypes.STRING(100) },
  TRANSACTION_STATUS: { type: DataTypes.STRING(40) },  // status mentah dari Midtrans
  FRAUD_STATUS: { type: DataTypes.STRING(40) },
  SIGNATURE_VALID: { type: DataTypes.BOOLEAN, defaultValue: false },
  MAPPED_STATUS: { type: DataTypes.STRING(20) },       // status lokal hasil pemetaan
  RAW: { type: DataTypes.TEXT('long') },               // raw JSON payload webhook
  MERCHANT_ID: { type: DataTypes.INTEGER },
  ID_PENJUALAN: { type: DataTypes.INTEGER },
  CREATED_AT: { type: DataTypes.DATE },
  UPDATED_AT: { type: DataTypes.DATE },
}, {
  tableName: 't_payment_webhook_log',
  timestamps: true,
  createdAt: 'CREATED_AT',
  updatedAt: 'UPDATED_AT',
});

module.exports = PaymentWebhookLog;
