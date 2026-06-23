const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// t_pembelian - header pembelian (restok). STATUS: 0=DRAFT, 1=SELESAI, 2=CANCELLED.
const Pembelian = sequelize.define('t_pembelian', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  NO_NOTA: { type: DataTypes.STRING(50) },
  TANGGAL: { type: DataTypes.DATEONLY },
  ID_USER: { type: DataTypes.INTEGER },
  ID_SUPPLIER: { type: DataTypes.INTEGER },   // supplier di header nota
  CATATAN: { type: DataTypes.TEXT },
  STATUS: { type: DataTypes.INTEGER, defaultValue: 0 },
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, { tableName: 't_pembelian' });

module.exports = Pembelian;
