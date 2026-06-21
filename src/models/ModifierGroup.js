const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// m_modifier_group - grup varian/modifier produk (mis. Ukuran, Topping).
// TIPE: SINGLE (pilih satu) | MULTI (pilih banyak). WAJIB: harus dipilih saat jual.
const ModifierGroup = sequelize.define('m_modifier_group', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  NAMA: { type: DataTypes.STRING(100) },
  TIPE: { type: DataTypes.STRING(10), defaultValue: 'SINGLE' },
  WAJIB: { type: DataTypes.BOOLEAN, defaultValue: false },
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, {
  tableName: 'm_modifier_group',
  timestamps: true,
  createdAt: 'CREATED_AT',
  updatedAt: 'UPDATED_AT',
});

module.exports = ModifierGroup;
