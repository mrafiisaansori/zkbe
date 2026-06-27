const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// t_kas_shift - sesi kas / shift kasir. STATUS: 1=OPEN, 0=CLOSED.
// Mendukung multi-kasir bersamaan: 1 laci fisik = 1 shift.
const KasShift = sequelize.define('t_kas_shift', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ID_USER: { type: DataTypes.INTEGER },
  STATION: { type: DataTypes.STRING(50) },
  MODAL_AWAL: { type: DataTypes.DOUBLE, defaultValue: 0 },
  BUKA_AT: { type: DataTypes.DATE },
  TUTUP_AT: { type: DataTypes.DATE },
  EXPECTED_CASH: { type: DataTypes.DOUBLE, defaultValue: 0 },
  ACTUAL_CASH: { type: DataTypes.DOUBLE, defaultValue: 0 },
  SELISIH_CASH: { type: DataTypes.DOUBLE, defaultValue: 0 },
  STATUS: { type: DataTypes.INTEGER, defaultValue: 1 },
  CATATAN_BUKA: { type: DataTypes.TEXT },
  CATATAN_TUTUP: { type: DataTypes.TEXT },
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, { tableName: 't_kas_shift', timestamps: false });

module.exports = KasShift;
