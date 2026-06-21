const { Op } = require('sequelize');
const { Transaksi } = require('../models');
const ApiError = require('../utils/ApiError');

// Transaksi keuangan (kas) - t_transaksi. JENIS_TRANSAKSI: 'M'=masuk, 'K'=keluar.
async function list({ tanggal_awal, tanggal_akhir, tanggal } = {}) {
  const where = {};
  if (tanggal) where.TANGGAL = tanggal;
  else if (tanggal_awal && tanggal_akhir) where.TANGGAL = { [Op.between]: [tanggal_awal, tanggal_akhir] };
  return Transaksi.findAll({ where, order: [['ID', 'ASC']] });
}

const create = (data) => Transaksi.create({
  NAMA_TRANSAKSI: data.nama,
  JENIS_TRANSAKSI: data.jenis,
  NOMINAL: String(data.nominal),
  TANGGAL: data.tanggal,
});

async function remove(id) {
  const row = await Transaksi.findByPk(id);
  if (!row) throw new ApiError(404, 'Transaksi keuangan tidak ditemukan');
  await row.destroy();
  return true;
}

module.exports = { list, create, remove };
