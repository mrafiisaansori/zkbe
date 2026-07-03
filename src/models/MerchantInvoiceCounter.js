const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Counter nomor nota penjualan per merchant. Satu baris per merchant.
const MerchantInvoiceCounter = sequelize.define('m_merchant_invoice_counter', {
  MERCHANT_ID: { type: DataTypes.INTEGER, primaryKey: true },
  LAST_NO: { type: DataTypes.INTEGER, defaultValue: 0 },
  UPDATED_AT: { type: DataTypes.DATE },
}, {
  tableName: 'm_merchant_invoice_counter',
  timestamps: false,
});

module.exports = MerchantInvoiceCounter;
