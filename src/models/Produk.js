const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// m_produk - master produk/barang.
const Produk = sequelize.define('m_produk', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  NAMA: { type: DataTypes.STRING(150) },
  ID_KATEGORI: { type: DataTypes.INTEGER },
  STOK: { type: DataTypes.DOUBLE },
  HARGA_BELI: { type: DataTypes.INTEGER },
  HARGA_JUAL: { type: DataTypes.INTEGER },
  BARCODE: { type: DataTypes.TEXT },
  FOTO: { type: DataTypes.TEXT },
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, { tableName: 'm_produk' });

module.exports = Produk;
