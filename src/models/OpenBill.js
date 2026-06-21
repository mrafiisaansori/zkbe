const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// t_open_bill - header pesanan terbuka (bayar di akhir / open bill).
// STATUS: 'OPEN' (belum dibayar), 'PAID' (lunas), 'CANCELLED' (dibatalkan).
// ID_PENJUALAN: diisi setelah bill dibayar (relasi ke t_penjualan untuk riwayat/laporan).
const OpenBill = sequelize.define('t_open_bill', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  NO_BILL: { type: DataTypes.STRING(50) },
  CUSTOMER_NAME: { type: DataTypes.STRING(150) },
  TABLE_NO: { type: DataTypes.STRING(30) },
  NOTE: { type: DataTypes.TEXT },
  STATUS: { type: DataTypes.STRING(12), defaultValue: 'OPEN' },
  TOTAL: { type: DataTypes.DOUBLE, defaultValue: 0 }, // cache subtotal item (sebelum diskon bayar)
  ID_USER: { type: DataTypes.INTEGER }, // kasir pembuat
  ID_PENJUALAN: { type: DataTypes.INTEGER }, // diisi saat PAID
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, {
  tableName: 't_open_bill',
  timestamps: true,
  createdAt: 'CREATED_AT',
  updatedAt: 'UPDATED_AT',
});

module.exports = OpenBill;
