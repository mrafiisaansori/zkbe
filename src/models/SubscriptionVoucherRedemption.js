const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// t_subscription_voucher_redemption - jejak pemakaian voucher per merchant.
// UNIQUE(ID_VOUCHER, MERCHANT_ID) di DB -> 1 merchant hanya bisa redeem 1x per kode.
const SubscriptionVoucherRedemption = sequelize.define('t_subscription_voucher_redemption', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ID_VOUCHER: { type: DataTypes.INTEGER },
  TARGET_PLAN: { type: DataTypes.STRING(10) },
  PAKET: { type: DataTypes.STRING(10) },
  DURATION_MONTHS: { type: DataTypes.INTEGER },
  PRO_EXPIRES_AT: { type: DataTypes.DATE }, // snapshot hasil setelah redeem
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, {
  tableName: 't_subscription_voucher_redemption',
  timestamps: true,
  createdAt: 'CREATED_AT',
  updatedAt: false,
});

module.exports = SubscriptionVoucherRedemption;
