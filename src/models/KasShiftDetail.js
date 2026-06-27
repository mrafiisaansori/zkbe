const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// t_kas_shift_detail - rincian closing per metode bayar.
// EXPECTED dihitung sistem; ACTUAL diinput kasir; SELISIH = ACTUAL - EXPECTED.
const KasShiftDetail = sequelize.define('t_kas_shift_detail', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ID_SHIFT: { type: DataTypes.INTEGER },
  ID_JENIS_BAYAR: { type: DataTypes.INTEGER },
  NAMA_JENIS: { type: DataTypes.STRING(100) },
  IS_CASH: { type: DataTypes.INTEGER, defaultValue: 0 },
  EXPECTED: { type: DataTypes.DOUBLE, defaultValue: 0 },
  ACTUAL: { type: DataTypes.DOUBLE, defaultValue: 0 },
  SELISIH: { type: DataTypes.DOUBLE, defaultValue: 0 },
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, { tableName: 't_kas_shift_detail', timestamps: false });

module.exports = KasShiftDetail;
