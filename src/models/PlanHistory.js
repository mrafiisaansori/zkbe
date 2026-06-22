const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// m_plan_history - riwayat perubahan plan (FREE/PRO) oleh Super Admin atau
// sistem (verifikasi pembayaran). Untuk audit/jejak aktivasi & nonaktivasi PRO.
const PlanHistory = sequelize.define('m_plan_history', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  MERCHANT_ID: { type: DataTypes.INTEGER },
  OLD_PLAN: { type: DataTypes.STRING(10) },
  NEW_PLAN: { type: DataTypes.STRING(10) },
  PRO_STARTS_AT: { type: DataTypes.DATE },
  PRO_EXPIRES_AT: { type: DataTypes.DATE },
  NOTE: { type: DataTypes.STRING(255) },
  SOURCE: { type: DataTypes.STRING(20), defaultValue: 'MANUAL' }, // MANUAL | PAYMENT
  CHANGED_BY: { type: DataTypes.INTEGER }, // ID user super admin
  CREATED_AT: { type: DataTypes.DATE },
}, {
  tableName: 'm_plan_history',
  timestamps: true,
  createdAt: 'CREATED_AT',
  updatedAt: false,
});

module.exports = PlanHistory;
