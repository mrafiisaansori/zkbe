const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// m_qris - pengaturan pembayaran QRIS statis toko (umumnya satu baris, ID=1).
const Qris = sequelize.define('m_qris', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  MERCHANT_NAME: { type: DataTypes.STRING(150) },
  NMID: { type: DataTypes.STRING(50) },
  IMAGE: { type: DataTypes.TEXT }, // path relatif: uploads/qris/<filename>
  IS_ACTIVE: { type: DataTypes.BOOLEAN, defaultValue: false },
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, {
  tableName: 'm_qris',
  timestamps: true,
  createdAt: 'CREATED_AT',
  updatedAt: 'UPDATED_AT',
});

module.exports = Qris;
