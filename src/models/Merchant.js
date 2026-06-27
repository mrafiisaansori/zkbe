const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// m_merchant - toko/merchant (tenant). Setiap merchant punya data terpisah.
// STATUS: 'pending' (belum verifikasi OTP), 'active', 'suspended'.
const Merchant = sequelize.define('m_merchant', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  NAMA: { type: DataTypes.STRING(150) },            // nama toko/merchant
  OWNER_NAME: { type: DataTypes.STRING(150) },
  EMAIL: { type: DataTypes.STRING(150) },
  PHONE: { type: DataTypes.STRING(30) },
  ADDRESS: { type: DataTypes.TEXT },
  CITY: { type: DataTypes.STRING(100) },
  PROVINCE: { type: DataTypes.STRING(100) },
  BUSINESS_CATEGORY: { type: DataTypes.STRING(100) },
  INVOICE_PREFIX: { type: DataTypes.STRING(15) },   // prefix nomor nota, mis. "TZK"
  SLUG: { type: DataTypes.STRING(80) },             // katalog publik: /store/{slug}
  STATUS: { type: DataTypes.STRING(20), defaultValue: 'active' },
  PLAN: { type: DataTypes.STRING(10), defaultValue: 'FREE' }, // 'FREE' | 'PRO' | 'BUSINESS'
  ONBOARDING_DONE: { type: DataTypes.INTEGER, defaultValue: 0 }, // 0=belum, 1=selesai/skip
  PRO_STARTS_AT: { type: DataTypes.DATE },          // tanggal mulai plan berbayar (manual super admin)
  PRO_EXPIRES_AT: { type: DataTypes.DATE },         // masa aktif plan berbayar (PRO/BUSINESS). null = belum pernah berbayar
  CREATED_AT: { type: DataTypes.DATE },
  UPDATED_AT: { type: DataTypes.DATE },
}, {
  tableName: 'm_merchant',
  timestamps: true,
  createdAt: 'CREATED_AT',
  updatedAt: 'UPDATED_AT',
});

module.exports = Merchant;
