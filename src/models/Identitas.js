const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// m_identitas - identitas toko.
const Identitas = sequelize.define('m_identitas', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  NAMA: { type: DataTypes.STRING(150) },
  ALAMAT: { type: DataTypes.TEXT },
  NO_TELP: { type: DataTypes.STRING(20) },
  EMAIL: { type: DataTypes.STRING(100) },
  WEBSITE: { type: DataTypes.STRING(100) },
  LOGO: { type: DataTypes.TEXT },
  BANNER: { type: DataTypes.TEXT }, // banner katalog publik
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, { tableName: 'm_identitas' });

module.exports = Identitas;
