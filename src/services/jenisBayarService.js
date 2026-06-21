const { JenisBayar } = require('../models');
const ApiError = require('../utils/ApiError');

const list = () => JenisBayar.findAll({ order: [['NAMA', 'ASC']] });
async function getById(id) {
  const j = await JenisBayar.findByPk(id);
  if (!j) throw new ApiError(404, 'Jenis bayar tidak ditemukan');
  return j;
}
const create = (data) => JenisBayar.create({ NAMA: data.nama });
async function update(id, data) {
  const j = await getById(id);
  await j.update({ NAMA: data.nama ?? j.NAMA });
  return j;
}
async function remove(id) { await (await getById(id)).destroy(); return true; }

module.exports = { list, getById, create, update, remove };
