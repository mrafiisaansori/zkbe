const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Riwayat pembayaran parsial untuk split bill. Transaksi penjualan tetap
// disimpan di t_penjualan; tabel ini hanya mengikat transaksi itu ke open bill.
const OpenBillPayment = sequelize.define('t_open_bill_payment', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ID_OPEN_BILL: { type: DataTypes.INTEGER },
  ID_PENJUALAN: { type: DataTypes.INTEGER },
  SPLIT_NO: { type: DataTypes.INTEGER },
  PAYER_NAME: { type: DataTypes.STRING(150) },
  TOTAL: { type: DataTypes.DOUBLE, defaultValue: 0 },
  ID_JENIS_BAYAR: { type: DataTypes.INTEGER },
  BAYAR: { type: DataTypes.DOUBLE },
  KEMBALIAN: { type: DataTypes.DOUBLE },
  NOTE: { type: DataTypes.TEXT },
  ITEMS_JSON: { type: DataTypes.TEXT },
  PAYMENT_PROVIDER: { type: DataTypes.STRING(20) },
  PAYMENT_STATUS: { type: DataTypes.STRING(20) },
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, {
  tableName: 't_open_bill_payment',
  timestamps: true,
  createdAt: 'CREATED_AT',
  updatedAt: 'UPDATED_AT',
});

module.exports = OpenBillPayment;
