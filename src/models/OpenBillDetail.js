const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// t_open_bill_detail - item pada sebuah open bill. Harga di-snapshot saat input
// agar perubahan harga produk tidak mengubah bill berjalan.
const OpenBillDetail = sequelize.define('t_open_bill_detail', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ID_OPEN_BILL: { type: DataTypes.INTEGER },
  ID_PRODUK: { type: DataTypes.INTEGER },
  HARGA_BELI: { type: DataTypes.INTEGER }, // modal baris = HARGA_BELI_DASAR + modal opsi varian (dipakai laporan laba)
  HARGA_BELI_DASAR: { type: DataTypes.INTEGER }, // harga beli produk saja saat bill dibuat (snapshot, TANPA varian), null = data lama
  HARGA_JUAL: { type: DataTypes.INTEGER }, // = HARGA_DASAR + HARGA_VARIAN
  HARGA_DASAR: { type: DataTypes.INTEGER }, // harga jual produk saat bill dibuat (snapshot), null = data lama
  HARGA_VARIAN: { type: DataTypes.INTEGER }, // total tambahan harga opsi varian per unit, null = data lama
  QTY: { type: DataTypes.DOUBLE },
  PAID_QTY: { type: DataTypes.DOUBLE, defaultValue: 0 },
  MODIFIER: { type: DataTypes.TEXT }, // deskripsi varian terpilih
  MODIFIER_OPTIONS: { type: DataTypes.STRING(255) }, // csv id opsi (untuk edit bill)
  MODIFIER_DETAIL: { type: DataTypes.TEXT }, // JSON snapshot opsi: [{id,nama,grup,harga,harga_beli}]
  NOTE: { type: DataTypes.STRING(255) },
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, { tableName: 't_open_bill_detail' });

module.exports = OpenBillDetail;
