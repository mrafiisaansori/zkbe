const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// t_detail_pembelian - item per pembelian. QTY_LAMA = stok produk saat input.
const DetailPembelian = sequelize.define('t_detail_pembelian', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ID_TRANSAKSI_PEMBELIAN: { type: DataTypes.INTEGER },
  ID_PRODUK: { type: DataTypes.INTEGER },
  HARGA_BELI: { type: DataTypes.INTEGER },
  QTY: { type: DataTypes.DOUBLE },
  QTY_LAMA: { type: DataTypes.DOUBLE },
  ID_SUPPLIER: { type: DataTypes.INTEGER },
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, { tableName: 't_detail_pembelian' });

module.exports = DetailPembelian;
