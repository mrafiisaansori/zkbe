const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// m_kategori - kategori produk.
const Kategori = sequelize.define('m_kategori', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  DESKRIPSI: { type: DataTypes.STRING(150) },
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, { tableName: 'm_kategori' });

module.exports = Kategori;
