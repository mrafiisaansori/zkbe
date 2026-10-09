const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// m_subscription_voucher - kode voucher redeem langganan (dibuat Super Admin).
// Redeem = langsung perpanjang PRO_EXPIRES_AT merchant sejumlah durasi PAKET,
// TANPA lewat pembayaran Midtrans. Global (bukan per-merchant), TIDAK di-scope.
const SubscriptionVoucher = sequelize.define('m_subscription_voucher', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  KODE: { type: DataTypes.STRING(50) },
  TARGET_PLAN: { type: DataTypes.STRING(10), defaultValue: 'PRO' }, // PRO | BUSINESS
  PAKET: { type: DataTypes.STRING(10), defaultValue: 'BULANAN' },  // BULANAN | 3_BULAN | 6_BULAN | TAHUNAN
  MAX_REDEMPTIONS: { type: DataTypes.INTEGER }, // null = tanpa batas kuota
  USED_COUNT: { type: DataTypes.INTEGER, defaultValue: 0 },
  VALID_FROM: { type: DataTypes.DATEONLY },
  VALID_UNTIL: { type: DataTypes.DATEONLY },
  IS_ACTIVE: { type: DataTypes.BOOLEAN, defaultValue: true },
  NOTE: { type: DataTypes.STRING(255) },
  CREATED_BY: { type: DataTypes.INTEGER }, // ID super admin pembuat
}, {
  tableName: 'm_subscription_voucher',
  timestamps: true,
  createdAt: 'CREATED_AT',
  updatedAt: 'UPDATED_AT',
});

module.exports = SubscriptionVoucher;
