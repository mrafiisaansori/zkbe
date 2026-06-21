const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// t_rekam_stok - histori pergerakan stok. JENIS: 1=restok(+), 2=keluar/retur(-).
const RekamStok = sequelize.define('t_rekam_stok', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ID_PRODUK: { type: DataTypes.INTEGER },
  JENIS: { type: DataTypes.INTEGER },
  QTY: { type: DataTypes.DOUBLE },
  TANGGAL: { type: DataTypes.DATE },
  KETERANGAN: { type: DataTypes.TEXT },
  ID_USER: { type: DataTypes.INTEGER }, // user yang melakukan input/penyesuaian stok
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, { tableName: 't_rekam_stok' });

module.exports = RekamStok;
