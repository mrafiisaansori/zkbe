const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// t_open_bill_detail - item pada sebuah open bill. Harga di-snapshot saat input
// agar perubahan harga produk tidak mengubah bill berjalan.
const OpenBillDetail = sequelize.define('t_open_bill_detail', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ID_OPEN_BILL: { type: DataTypes.INTEGER },
  ID_PRODUK: { type: DataTypes.INTEGER },
  HARGA_BELI: { type: DataTypes.INTEGER },
  HARGA_JUAL: { type: DataTypes.INTEGER },
  QTY: { type: DataTypes.DOUBLE },
  MODIFIER: { type: DataTypes.TEXT }, // deskripsi varian terpilih
  MODIFIER_OPTIONS: { type: DataTypes.STRING(255) }, // csv id opsi (untuk edit bill)
  NOTE: { type: DataTypes.STRING(255) },
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, { tableName: 't_open_bill_detail' });

module.exports = OpenBillDetail;
