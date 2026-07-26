const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// m_satuan - satuan/UOM produk (Pcs, Box, Dus, Kg, Liter, Botol, dll).
const Satuan = sequelize.define('m_satuan', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  NAMA: { type: DataTypes.STRING(50) },
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, { tableName: 'm_satuan' });

module.exports = Satuan;
