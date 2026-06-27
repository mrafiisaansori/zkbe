const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// t_kas_mutasi - kas masuk/keluar laci di luar penjualan dalam satu shift.
// TIPE: 'IN' = kas masuk, 'OUT' = kas keluar.
const KasMutasi = sequelize.define('t_kas_mutasi', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ID_SHIFT: { type: DataTypes.INTEGER },
  TIPE: { type: DataTypes.STRING(3) },
  NOMINAL: { type: DataTypes.DOUBLE, defaultValue: 0 },
  KETERANGAN: { type: DataTypes.STRING(255) },
  ID_USER: { type: DataTypes.INTEGER },
  CREATED_AT: { type: DataTypes.DATE },
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, { tableName: 't_kas_mutasi', timestamps: false });

module.exports = KasMutasi;
