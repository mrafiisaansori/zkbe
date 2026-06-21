const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// m_supplier
const Supplier = sequelize.define('m_supplier', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  NAMA: { type: DataTypes.STRING(100) },
  ALAMAT: { type: DataTypes.TEXT },
  NO_TELP: { type: DataTypes.STRING(20) },
  NAMA_PIC: { type: DataTypes.STRING(100) },
  NO_TELP_PIC: { type: DataTypes.STRING(20) },
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, { tableName: 'm_supplier' });

module.exports = Supplier;
