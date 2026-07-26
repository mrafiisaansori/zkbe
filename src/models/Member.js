const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// m_member - master member/customer (fitur khusus plan PRO). KODE_MEMBER
// digenerate otomatis saat create (lihat memberService.create).
const Member = sequelize.define('m_member', {
  ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  KODE_MEMBER: { type: DataTypes.STRING(30) },
  NAMA: { type: DataTypes.STRING(150) },
  NO_HP: { type: DataTypes.STRING(30) },
  EMAIL: { type: DataTypes.STRING(150) },
  ALAMAT: { type: DataTypes.TEXT },
  STATUS: { type: DataTypes.INTEGER, defaultValue: 1 }, // 1 aktif, 0 nonaktif
  TANGGAL_DAFTAR: { type: DataTypes.DATEONLY },
  MERCHANT_ID: { type: DataTypes.INTEGER },
}, {
  tableName: 'm_member',
  timestamps: true,
  createdAt: 'CREATED_AT',
  updatedAt: 'UPDATED_AT',
});

module.exports = Member;
