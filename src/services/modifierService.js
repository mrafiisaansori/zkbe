const { sequelize, ModifierGroup, ModifierOption, ProdukModifier } = require('../models');
const ApiError = require('../utils/ApiError');
const { activeMerchantId } = require('../utils/tenancy');

const includeOptions = [{ model: ModifierOption, as: 'options', separate: true, order: [['ID', 'ASC']] }];

// ===== Grup =====
async function listGroups() {
  return ModifierGroup.findAll({ include: includeOptions, order: [['ID', 'ASC']] });
}

async function createGroup(data) {
  return ModifierGroup.create({ NAMA: data.nama, TIPE: data.tipe || 'SINGLE', WAJIB: !!data.wajib });
}

async function updateGroup(id, data) {
  const g = await ModifierGroup.findByPk(id);
  if (!g) throw new ApiError(404, 'Grup modifier tidak ditemukan');
  const map = { NAMA: data.nama, TIPE: data.tipe, WAJIB: data.wajib };
  Object.keys(map).forEach((k) => { if (map[k] === undefined) delete map[k]; });
  await g.update(map);
  return g;
}

async function removeGroup(id) {
  const g = await ModifierGroup.findByPk(id);
  if (!g) throw new ApiError(404, 'Grup modifier tidak ditemukan');
  await ModifierOption.destroy({ where: { ID_GROUP: id } });
  await ProdukModifier.destroy({ where: { ID_GROUP: id } });
  await g.destroy();
  return true;
}

// ===== Opsi =====
async function addOption(groupId, data) {
  const g = await ModifierGroup.findByPk(groupId);
  if (!g) throw new ApiError(404, 'Grup modifier tidak ditemukan');
  return ModifierOption.create({
    ID_GROUP: groupId, NAMA: data.nama, HARGA: Number(data.harga) || 0, HARGA_BELI: Number(data.harga_beli) || 0,
  });
}

async function updateOption(id, data) {
  const o = await ModifierOption.findByPk(id);
  if (!o) throw new ApiError(404, 'Opsi tidak ditemukan');
  const map = { NAMA: data.nama, HARGA: data.harga, HARGA_BELI: data.harga_beli };
  Object.keys(map).forEach((k) => { if (map[k] === undefined) delete map[k]; });
  await o.update(map);
  return o;
}

async function removeOption(id) {
  const o = await ModifierOption.findByPk(id);
  if (!o) throw new ApiError(404, 'Opsi tidak ditemukan');
  await o.destroy();
  return true;
}

// ===== Assign ke produk =====
async function getForProduct(produkId) {
  const links = await ProdukModifier.findAll({ where: { ID_PRODUK: produkId } });
  const groupIds = links.map((l) => l.ID_GROUP);
  if (!groupIds.length) return [];
  return ModifierGroup.findAll({ where: { ID: groupIds }, include: includeOptions, order: [['ID', 'ASC']] });
}

async function setProductGroups(produkId, groupIds) {
  const mid = activeMerchantId();
  await sequelize.transaction(async (t) => {
    await ProdukModifier.destroy({ where: { ID_PRODUK: produkId }, transaction: t });
    for (const gid of (groupIds || [])) {
      await ProdukModifier.create({
        ID_PRODUK: produkId, ID_GROUP: gid,
        ...(mid !== undefined ? { MERCHANT_ID: mid } : {}),
      }, { transaction: t });
    }
  });
  return getForProduct(produkId);
}

/**
 * Hitung tambahan harga/modal + deskripsi dari daftar option id (ter-scope merchant).
 * Dipakai saat checkout & open bill. Mengembalikan { extra, extraBeli, text, detail }.
 * - extra: total tambahan HARGA_JUAL per unit (HARGA_VARIAN baris).
 * - extraBeli: total tambahan modal per unit (bagian dari HARGA_BELI baris).
 * - detail: snapshot opsi untuk MODIFIER_DETAIL, null bila tidak ada opsi.
 */
async function resolveModifiers(optionIds) {
  const ids = (optionIds || []).map(Number).filter(Boolean);
  if (!ids.length) return { extra: 0, extraBeli: 0, text: null, detail: null };
  const opts = await ModifierOption.findAll({
    where: { ID: ids },
    include: [{ model: ModifierGroup, as: 'group', attributes: ['NAMA'] }],
  });
  const extra = opts.reduce((s, o) => s + (Number(o.HARGA) || 0), 0);
  const extraBeli = opts.reduce((s, o) => s + (Number(o.HARGA_BELI) || 0), 0);
  const byGroup = {};
  opts.forEach((o) => {
    const g = (o.group && o.group.NAMA) || 'Opsi';
    (byGroup[g] = byGroup[g] || []).push(o.NAMA);
  });
  const text = Object.entries(byGroup).map(([g, vals]) => `${g}: ${vals.join('/')}`).join(', ');
  const detail = opts.map((o) => ({
    id: o.ID,
    nama: o.NAMA,
    grup: (o.group && o.group.NAMA) || null,
    harga: Number(o.HARGA) || 0,
    harga_beli: Number(o.HARGA_BELI) || 0,
  }));
  return { extra, extraBeli, text: text || null, detail };
}

module.exports = {
  listGroups, createGroup, updateGroup, removeGroup,
  addOption, updateOption, removeOption,
  getForProduct, setProductGroups, resolveModifiers,
};
