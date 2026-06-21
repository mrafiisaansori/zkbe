const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// t_pembelian - header pembelian (restok). STATUS: 0=draft, 1=selesai.
const Pembelian = sequelize.define('t_pembelian', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  NO_NOTA: { type: DataTypes.STRING(50) },
  TANGGAL: { type: DataTypes.DATEONLY },
  ID_USER: { type: DataTypes.INTEGER },
  STATUS: { type: DataTypes.INTEGER, defaultValue: 0 },
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, { tableName: 't_pembelian' });

module.exports = Pembelian;
