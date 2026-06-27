const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// t_payment_log - audit semua interaksi ke payment gateway (request charge,
// raw response Midtrans, perubahan status). Per merchant (di-scope hook tenant).
const PaymentLog = sequelize.define('t_payment_log', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ID_PENJUALAN: { type: DataTypes.INTEGER },     // transaksi terkait (t_penjualan)
  PROVIDER: { type: DataTypes.STRING(20), defaultValue: 'midtrans' },
  ORDER_ID: { type: DataTypes.STRING(100) },
  TRANSACTION_ID: { type: DataTypes.STRING(100) },
  EVENT: { type: DataTypes.STRING(40) },         // 'charge_request' | 'charge_response' | 'status_update'
  PAYMENT_STATUS: { type: DataTypes.STRING(20) },// status lokal hasil event
  AMOUNT: { type: DataTypes.DOUBLE },
  RAW: { type: DataTypes.TEXT('long') },         // raw JSON request/response (audit/debug)
  MERCHANT_ID: { type: DataTypes.INTEGER },
  CREATED_AT: { type: DataTypes.DATE },
  UPDATED_AT: { type: DataTypes.DATE },
}, {
  tableName: 't_payment_log',
  timestamps: true,
  createdAt: 'CREATED_AT',
  updatedAt: 'UPDATED_AT',
});

module.exports = PaymentLog;
