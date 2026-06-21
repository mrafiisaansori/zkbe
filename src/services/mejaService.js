const crypto = require('crypto');
const { Meja } = require('../models');
const ApiError = require('../utils/ApiError');
const { currentPlan } = require('../utils/plan');

// QR Menu / meja hanya untuk plan PRO. Divalidasi di backend.
async function assertPro() {
  const plan = await currentPlan();
  if (plan !== 'PRO') {
    throw new ApiError(403, 'Fitur QR Menu & Self Order hanya tersedia di plan PRO. Upgrade ke PRO untuk menggunakannya.');
  }
}

function genToken() {
  return crypto.randomBytes(12).toString('hex'); // 24 char
}

async function list() {
  return Meja.findAll({ order: [['ID', 'ASC']] });
}

async function create({ nomor }) {
  await assertPro();
  let token; let exists = true;
  // Pastikan token unik global.
  /* eslint-disable no-await-in-loop */
  while (exists) {
    token = genToken();
    exists = await Meja.unscoped().findOne({ where: { QR_TOKEN: token } });
  }
  /* eslint-enable no-await-in-loop */
  return Meja.create({ NOMOR: String(nomor).trim(), QR_TOKEN: token, IS_ACTIVE: true });
}

async function update(id, { nomor, is_active }) {
  await assertPro();
  const m = await Meja.findByPk(id);
  if (!m) throw new ApiError(404, 'Meja tidak ditemukan');
  const patch = {};
  if (nomor !== undefined) patch.NOMOR = String(nomor).trim();
  if (is_active !== undefined) patch.IS_ACTIVE = is_active;
  await m.update(patch);
  return m;
}

async function remove(id) {
  const m = await Meja.findByPk(id);
  if (!m) throw new ApiError(404, 'Meja tidak ditemukan');
  await m.destroy();
  return true;
}

module.exports = { list, create, update, remove };
