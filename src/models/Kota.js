const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// m_kota - data referensi kabupaten/kota (ID = kode BPS, mis. "1101").
// PROVINSI_ID merujuk ke m_provinsi.ID. Tabel referensi global.
const Kota = sequelize.define('m_kota', {
  ID: { type: DataTypes.STRING(5), primaryKey: true },
  PROVINSI_ID: { type: DataTypes.STRING(2) },
  NAMA: { type: DataTypes.STRING(100) },
}, { tableName: 'm_kota' });

module.exports = Kota;
