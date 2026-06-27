const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// t_penjualan - header transaksi penjualan. STATUS: 1=sah, 0=batal/void.
// STATUS_BAYAR: status pembayaran (LUNAS/PAID, dll). Default LUNAS karena POS membayar di muka.
const Penjualan = sequelize.define('t_penjualan', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  TANGGAL: { type: DataTypes.DATEONLY },
  JAM: { type: DataTypes.TIME },
  ID_JENIS_BAYAR: { type: DataTypes.INTEGER },
  TOTAL: { type: DataTypes.STRING(100) },
  ID_USER: { type: DataTypes.INTEGER },
  ID_SHIFT: { type: DataTypes.INTEGER },          // sesi kas/shift tempat transaksi terjadi (null=tanpa sesi)
  KETERANGAN: { type: DataTypes.TEXT },
  DISKON: { type: DataTypes.STRING(255) },
  PPN: { type: DataTypes.DOUBLE, defaultValue: 0 },            // nominal PPN
  SERVICE_CHARGE: { type: DataTypes.DOUBLE, defaultValue: 0 }, // nominal service charge
  KODE_VOUCHER: { type: DataTypes.STRING(50) },
  DISKON_VOUCHER: { type: DataTypes.DOUBLE, defaultValue: 0 }, // nominal diskon voucher
  STATUS: { type: DataTypes.INTEGER, defaultValue: 1 },
  STATUS_BAYAR: { type: DataTypes.STRING(20), defaultValue: 'LUNAS' },
  // ===== Payment gateway (Midtrans QRIS dinamis) - khusus plan BUSINESS =====
  // PAYMENT_PROVIDER: null/'manual' (Cash/Transfer/QRIS statis) atau 'midtrans'.
  PAYMENT_PROVIDER: { type: DataTypes.STRING(20) },
  // PAYMENT_STATUS lokal: UNPAID | PENDING | PAID | EXPIRED | CANCELLED | FAILED.
  PAYMENT_STATUS: { type: DataTypes.STRING(20) },
  MIDTRANS_ORDER_ID: { type: DataTypes.STRING(100) },      // ZK-{MID}-{TRXID}-{TS}
  MIDTRANS_TRANSACTION_ID: { type: DataTypes.STRING(100) },// id transaksi dari Midtrans
  PAID_AT: { type: DataTypes.DATE },
  EXPIRED_AT: { type: DataTypes.DATE },
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, { tableName: 't_penjualan' });

module.exports = Penjualan;
