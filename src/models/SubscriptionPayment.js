const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// m_subscription_payment - pembayaran upgrade plan via QRIS dinamis Midtrans.
// STATUS baru: PENDING | PAID | EXPIRED | CANCELLED | FAILED.
// Status manual lama tetap terbaca untuk kompatibilitas riwayat.
const SubscriptionPayment = sequelize.define('m_subscription_payment', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  PAKET: { type: DataTypes.STRING(10) },             // BULANAN | TAHUNAN
  TARGET_PLAN: { type: DataTypes.STRING(10), defaultValue: 'PRO' }, // PRO | BUSINESS
  DURATION_MONTHS: { type: DataTypes.INTEGER, defaultValue: 1 },
  HARGA: { type: DataTypes.INTEGER, defaultValue: 0 }, // nominal asli paket
  KODE_UNIK: { type: DataTypes.INTEGER, defaultValue: 0 }, // 3 digit
  TOTAL_BAYAR: { type: DataTypes.INTEGER, defaultValue: 0 }, // HARGA + KODE_UNIK
  BUKTI: { type: DataTypes.TEXT },                   // path bukti bayar (opsional)
  STATUS: { type: DataTypes.STRING(25), defaultValue: 'PENDING' },
  REJECT_REASON: { type: DataTypes.TEXT },
  EXPIRES_AT: { type: DataTypes.DATE },              // batas waktu pembayaran
  PAID_AT: { type: DataTypes.DATE },                 // saat Midtrans mengonfirmasi pembayaran
  VERIFIED_AT: { type: DataTypes.DATE },
  VERIFIED_BY: { type: DataTypes.INTEGER },          // ID super admin
  PROVIDER: { type: DataTypes.STRING(20), defaultValue: 'midtrans' },
  GATEWAY_MERCHANT_ID: { type: DataTypes.STRING(50) },
  MIDTRANS_ORDER_ID: { type: DataTypes.STRING(100) },
  MIDTRANS_TRANSACTION_ID: { type: DataTypes.STRING(100) },
  QR_STRING: { type: DataTypes.TEXT },
  QR_URL: { type: DataTypes.TEXT },
  RAW_RESPONSE: { type: DataTypes.TEXT('long') },
  LAST_NOTIFICATION: { type: DataTypes.TEXT('long') },
  ACTIVATED_AT: { type: DataTypes.DATE },
  ID_USER: { type: DataTypes.INTEGER },              // admin merchant pembuat
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, {
  tableName: 'm_subscription_payment',
  timestamps: true,
  createdAt: 'CREATED_AT',
  updatedAt: 'UPDATED_AT',
});

module.exports = SubscriptionPayment;
