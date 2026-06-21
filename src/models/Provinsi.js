const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// m_provinsi - data referensi provinsi (ID = kode BPS, mis. "11").
// Tabel referensi global (tidak di-scope per merchant).
const Provinsi = sequelize.define('m_provinsi', {
  ID: { type: DataTypes.STRING(2), primaryKey: true },
  NAMA: { type: DataTypes.STRING(100) },
}, { tableName: 'm_provinsi' });

module.exports = Provinsi;
