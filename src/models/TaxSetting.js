const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// m_tax_setting - pengaturan PPN & service charge per merchant (1 baris/merchant).
const TaxSetting = sequelize.define('m_tax_setting', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  PPN_ENABLED: { type: DataTypes.BOOLEAN, defaultValue: false },
  PPN_PERSEN: { type: DataTypes.DOUBLE, defaultValue: 0 },
  SERVICE_ENABLED: { type: DataTypes.BOOLEAN, defaultValue: false },
  SERVICE_PERSEN: { type: DataTypes.DOUBLE, defaultValue: 0 },
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, {
  tableName: 'm_tax_setting',
  timestamps: true,
  createdAt: 'CREATED_AT',
  updatedAt: 'UPDATED_AT',
});

module.exports = TaxSetting;
