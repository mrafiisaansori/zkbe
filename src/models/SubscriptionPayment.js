const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// m_subscription_payment - pembayaran langganan PRO per merchant (QRIS manual/open QRIS).
// STATUS: PENDING -> WAITING_VERIFICATION -> VERIFIED | REJECTED | EXPIRED.
// KODE_UNIK: 3 digit pembeda nominal agar Super Admin mudah mencocokkan pembayaran.
const SubscriptionPayment = sequelize.define('m_subscription_payment', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  PAKET: { type: DataTypes.STRING(10) },             // BULANAN | TAHUNAN
  HARGA: { type: DataTypes.INTEGER, defaultValue: 0 }, // nominal asli paket
  KODE_UNIK: { type: DataTypes.INTEGER, defaultValue: 0 }, // 3 digit
  TOTAL_BAYAR: { type: DataTypes.INTEGER, defaultValue: 0 }, // HARGA + KODE_UNIK
  BUKTI: { type: DataTypes.TEXT },                   // path bukti bayar (opsional)
  STATUS: { type: DataTypes.STRING(25), defaultValue: 'PENDING' },
  REJECT_REASON: { type: DataTypes.TEXT },
  EXPIRES_AT: { type: DataTypes.DATE },              // batas waktu pembayaran
  PAID_AT: { type: DataTypes.DATE },                 // saat merchant submit/upload bukti
  VERIFIED_AT: { type: DataTypes.DATE },
  VERIFIED_BY: { type: DataTypes.INTEGER },          // ID super admin
  ID_USER: { type: DataTypes.INTEGER },              // admin merchant pembuat
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, {
  tableName: 'm_subscription_payment',
  timestamps: true,
  createdAt: 'CREATED_AT',
  updatedAt: 'UPDATED_AT',
});

module.exports = SubscriptionPayment;
