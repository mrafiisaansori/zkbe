const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// m_subscription_setting - pengaturan langganan Zona Kasir (GLOBAL, dikelola Super Admin).
// Hanya 1 baris (ID=1). TIDAK di-scope merchant.
const SubscriptionSetting = sequelize.define('m_subscription_setting', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  QRIS_IMAGE: { type: DataTypes.TEXT },                 // path relatif: uploads/subscription/<file>
  QRIS_LABEL: { type: DataTypes.STRING(150) },          // nama tampil QRIS (opsional)
  PRICE_MONTHLY: { type: DataTypes.INTEGER, defaultValue: 0 },
  PRICE_YEARLY: { type: DataTypes.INTEGER, defaultValue: 0 },
  PAYMENT_TTL_HOURS: { type: DataTypes.INTEGER, defaultValue: 24 }, // masa berlaku pembayaran
}, {
  tableName: 'm_subscription_setting',
  timestamps: true,
  createdAt: 'CREATED_AT',
  updatedAt: 'UPDATED_AT',
});

module.exports = SubscriptionSetting;
