const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// m_meja - meja & QR menu (self order). QR_TOKEN unik global, dipakai di URL publik.
const Meja = sequelize.define('m_meja', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  NOMOR: { type: DataTypes.STRING(50) },
  QR_TOKEN: { type: DataTypes.STRING(40) },
  IS_ACTIVE: { type: DataTypes.BOOLEAN, defaultValue: true },
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, {
  tableName: 'm_meja',
  timestamps: true,
  createdAt: 'CREATED_AT',
  updatedAt: 'UPDATED_AT',
});

module.exports = Meja;
