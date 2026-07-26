const { Satuan } = require('../models');
const ApiError = require('../utils/ApiError');

const list = () => Satuan.findAll({ order: [['NAMA', 'ASC']] });
async function getById(id) {
  const s = await Satuan.findByPk(id);
  if (!s) throw new ApiError(404, 'Satuan tidak ditemukan');
  return s;
}
const create = (data) => Satuan.create({ NAMA: data.nama });
async function update(id, data) {
  const s = await getById(id);
  await s.update({ NAMA: data.nama ?? s.NAMA });
  return s;
}
async function remove(id) { await (await getById(id)).destroy(); return true; }

module.exports = { list, getById, create, update, remove };
