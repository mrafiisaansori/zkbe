const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// t_detail_penjualan - item per transaksi penjualan.
const DetailPenjualan = sequelize.define('t_detail_penjualan', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ID_TRANSAKSI_PENJUALAN: { type: DataTypes.INTEGER },
  ID_PRODUK: { type: DataTypes.INTEGER },
  HARGA_BELI: { type: DataTypes.INTEGER }, // modal baris = HARGA_BELI_DASAR + modal opsi varian (dipakai laporan laba)
  HARGA_BELI_DASAR: { type: DataTypes.INTEGER }, // harga beli produk saja saat transaksi (snapshot, TANPA varian), null = data lama
  HARGA_JUAL: { type: DataTypes.INTEGER }, // = HARGA_DASAR + HARGA_VARIAN
  HARGA_DASAR: { type: DataTypes.INTEGER }, // harga jual produk saat transaksi (snapshot), null = data lama
  HARGA_VARIAN: { type: DataTypes.INTEGER }, // total tambahan harga opsi varian per unit, null = data lama
  QTY: { type: DataTypes.DOUBLE },
  MODIFIER: { type: DataTypes.TEXT }, // deskripsi varian terpilih (mis. "Ukuran: L, Topping: Boba")
  MODIFIER_DETAIL: { type: DataTypes.TEXT }, // JSON snapshot opsi: [{id,nama,grup,harga,harga_beli}]
  SATUAN: { type: DataTypes.STRING(50) }, // snapshot nama UOM produk saat transaksi (mis. "Box")
  DISKON: { type: DataTypes.DOUBLE, defaultValue: 0 }, // diskon per item (nominal)
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, { tableName: 't_detail_penjualan' });

module.exports = DetailPenjualan;
