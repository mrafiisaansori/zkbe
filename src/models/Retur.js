const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// t_retur - header retur barang.
const Retur = sequelize.define('t_retur', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  NO_NOTA: { type: DataTypes.STRING(50) },
  TANGGAL: { type: DataTypes.DATEONLY },
  ID_USER: { type: DataTypes.INTEGER },
  STATUS: { type: DataTypes.INTEGER, defaultValue: 0 },
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, { tableName: 't_retur' });

module.exports = Retur;
