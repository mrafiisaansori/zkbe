const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// m_produk_modifier - relasi produk <-> grup modifier.
const ProdukModifier = sequelize.define('m_produk_modifier', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ID_PRODUK: { type: DataTypes.INTEGER },
  ID_GROUP: { type: DataTypes.INTEGER },
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, {
  tableName: 'm_produk_modifier',
  timestamps: true,
  createdAt: 'CREATED_AT',
  updatedAt: 'UPDATED_AT',
});

module.exports = ProdukModifier;
