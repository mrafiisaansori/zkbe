const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// t_detail_retur - item per retur.
const DetailRetur = sequelize.define('t_detail_retur', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ID_TRANSAKSI_RETUR: { type: DataTypes.INTEGER },
  ID_PRODUK: { type: DataTypes.INTEGER },
  QTY: { type: DataTypes.DOUBLE },
  QTY_LAMA: { type: DataTypes.DOUBLE },
  ID_SUPPLIER: { type: DataTypes.INTEGER },
  ALASAN: { type: DataTypes.STRING(150) },   // alasan retur (rusak/salah kirim/dll)
  KONDISI: { type: DataTypes.STRING(50) },   // kondisi barang
  HARGA: { type: DataTypes.INTEGER },         // nilai/harga barang per unit
  KETERANGAN: { type: DataTypes.TEXT },
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, { tableName: 't_detail_retur' });

module.exports = DetailRetur;
