const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// m_voucher - promo/voucher sederhana per merchant.
// TIPE: 'NOMINAL' (potongan Rp) atau 'PERSEN' (potongan %).
const Voucher = sequelize.define('m_voucher', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  KODE: { type: DataTypes.STRING(50) },
  TIPE: { type: DataTypes.STRING(10), defaultValue: 'NOMINAL' }, // NOMINAL | PERSEN
  NILAI: { type: DataTypes.DOUBLE, defaultValue: 0 },
  MIN_TRANSAKSI: { type: DataTypes.DOUBLE, defaultValue: 0 },
  VALID_FROM: { type: DataTypes.DATEONLY },
  VALID_UNTIL: { type: DataTypes.DATEONLY },
  IS_ACTIVE: { type: DataTypes.BOOLEAN, defaultValue: true },
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, {
  tableName: 'm_voucher',
  timestamps: true,
  createdAt: 'CREATED_AT',
  updatedAt: 'UPDATED_AT',
});

module.exports = Voucher;
