const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// m_jenis_bayar - metode pembayaran (Cash, dll).
const JenisBayar = sequelize.define('m_jenis_bayar', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  NAMA: { type: DataTypes.STRING(100) },
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, { tableName: 'm_jenis_bayar' });

module.exports = JenisBayar;
