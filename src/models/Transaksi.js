const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// t_transaksi - transaksi keuangan (kas masuk/keluar). JENIS_TRANSAKSI: 'M'/'K' atau sesuai data.
const Transaksi = sequelize.define('t_transaksi', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  NAMA_TRANSAKSI: { type: DataTypes.TEXT },
  JENIS_TRANSAKSI: { type: DataTypes.STRING(1) },
  NOMINAL: { type: DataTypes.STRING(255) },
  TANGGAL: { type: DataTypes.DATEONLY },
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, { tableName: 't_transaksi' });

module.exports = Transaksi;
