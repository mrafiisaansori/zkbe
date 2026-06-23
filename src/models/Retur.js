const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// t_retur - header retur barang ke supplier.
// STATUS: 0=DRAFT, 1=SELESAI, 2=DIBATALKAN (void mengembalikan stok).
const Retur = sequelize.define('t_retur', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  NO_NOTA: { type: DataTypes.STRING(50) },
  TANGGAL: { type: DataTypes.DATEONLY },
  ID_USER: { type: DataTypes.INTEGER },
  ID_SUPPLIER: { type: DataTypes.INTEGER },     // supplier tujuan retur (header)
  ID_PEMBELIAN: { type: DataTypes.INTEGER },    // pembelian asal (opsional)
  CATATAN: { type: DataTypes.TEXT },
  STATUS: { type: DataTypes.INTEGER, defaultValue: 0 },
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, { tableName: 't_retur' });

module.exports = Retur;
