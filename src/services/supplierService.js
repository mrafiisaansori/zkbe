const { Op } = require('sequelize');
const { Supplier } = require('../models');
const ApiError = require('../utils/ApiError');

// Semua query ter-scope merchant otomatis (hook tenant) — admin merchant hanya
// melihat/mengelola supplier miliknya sendiri.
async function list({ search, status } = {}) {
  const where = {};
  if (status !== undefined && status !== '' && status !== null) where.STATUS = Number(status);
  if (search) {
    where[Op.or] = [
      { NAMA: { [Op.like]: `%${search}%` } },
      { NO_TELP: { [Op.like]: `%${search}%` } },
      { EMAIL: { [Op.like]: `%${search}%` } },
    ];
  }
  return Supplier.findAll({ where, order: [['NAMA', 'ASC']] });
}

async function getById(id) {
  const s = await Supplier.findByPk(id);
  if (!s) throw new ApiError(404, 'Supplier tidak ditemukan');
  return s;
}

const map = (d) => ({
  NAMA: d.nama,
  ALAMAT: d.alamat,
  NO_TELP: d.no_telp,
  EMAIL: d.email,
  CATATAN: d.catatan,
  STATUS: d.status,
  NAMA_PIC: d.nama_pic,
  NO_TELP_PIC: d.no_telp_pic,
});

const create = (data) => Supplier.create(map(data));

async function update(id, data) {
  const s = await getById(id);
  const m = map(data);
  Object.keys(m).forEach((k) => { if (m[k] === undefined) delete m[k]; });
  await s.update(m);
  return s;
}

async function remove(id) { await (await getById(id)).destroy(); return true; }

module.exports = { list, getById, create, update, remove };
