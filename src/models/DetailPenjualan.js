const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// t_detail_penjualan - item per transaksi penjualan.
const DetailPenjualan = sequelize.define('t_detail_penjualan', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ID_TRANSAKSI_PENJUALAN: { type: DataTypes.INTEGER },
  ID_PRODUK: { type: DataTypes.INTEGER },
  HARGA_BELI: { type: DataTypes.INTEGER },
  HARGA_JUAL: { type: DataTypes.INTEGER },
  QTY: { type: DataTypes.DOUBLE },
  MODIFIER: { type: DataTypes.TEXT }, // deskripsi varian terpilih (mis. "Ukuran: L, Topping: Boba")
  DISKON: { type: DataTypes.DOUBLE, defaultValue: 0 }, // diskon per item (nominal)
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, { tableName: 't_detail_penjualan' });

module.exports = DetailPenjualan;
