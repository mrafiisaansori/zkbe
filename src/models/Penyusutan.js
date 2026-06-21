const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// t_penyusutan_produk - penyusutan / perubahan harga jual produk.
const Penyusutan = sequelize.define('t_penyusutan_produk', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ID_PRODUK: { type: DataTypes.INTEGER },
  HARGA_JUAL_AWAL: { type: DataTypes.INTEGER },
  HARGA_JUAL_AKHIR: { type: DataTypes.INTEGER },
  PROSENTASE_PENYUSUTAN: { type: DataTypes.INTEGER },
  TANGGAL: { type: DataTypes.DATE },
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, { tableName: 't_penyusutan_produk' });

module.exports = Penyusutan;
