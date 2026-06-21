const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// m_pengguna - user/akun (admin & kasir). LEVEL: 1=admin, 2=kasir.
const Pengguna = sequelize.define('m_pengguna', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  NAMA: { type: DataTypes.STRING(100) },
  USERNAME: { type: DataTypes.STRING(100) },
  PASSWORD: { type: DataTypes.STRING(100) },
  LEVEL: { type: DataTypes.INTEGER }, // 1 admin, 2 kasir
  TELP: { type: DataTypes.STRING(20) },
  MERCHANT_ID: { type: DataTypes.INTEGER }, // null = super admin (global)
}, { tableName: 'm_pengguna' });

module.exports = Pengguna;
