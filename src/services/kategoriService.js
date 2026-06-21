const { Kategori } = require('../models');
const ApiError = require('../utils/ApiError');

const list = () => Kategori.findAll({ order: [['DESKRIPSI', 'ASC']] });
async function getById(id) {
  const k = await Kategori.findByPk(id);
  if (!k) throw new ApiError(404, 'Kategori tidak ditemukan');
  return k;
}
const create = (data) => Kategori.create({ DESKRIPSI: data.deskripsi });
async function update(id, data) {
  const k = await getById(id);
  await k.update({ DESKRIPSI: data.deskripsi ?? k.DESKRIPSI });
  return k;
}
async function remove(id) { await (await getById(id)).destroy(); return true; }

module.exports = { list, getById, create, update, remove };
