const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// m_modifier_option - opsi dalam sebuah grup modifier. HARGA = tambahan harga.
const ModifierOption = sequelize.define('m_modifier_option', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ID_GROUP: { type: DataTypes.INTEGER },
  NAMA: { type: DataTypes.STRING(100) },
  HARGA: { type: DataTypes.INTEGER, defaultValue: 0 },
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, {
  tableName: 'm_modifier_option',
  timestamps: true,
  createdAt: 'CREATED_AT',
  updatedAt: 'UPDATED_AT',
});

module.exports = ModifierOption;
