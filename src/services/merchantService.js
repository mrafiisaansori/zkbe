const { Op } = require('sequelize');
const { Merchant, Pengguna, Penjualan } = require('../models');
const ApiError = require('../utils/ApiError');

const ALLOWED_STATUS = ['active', 'suspended', 'pending'];

// ===== Super Admin =====
async function listAll({ search, status } = {}) {
  const where = {};
  if (status) where.STATUS = status;
  if (search) {
    where[Op.or] = [
      { NAMA: { [Op.like]: `%${search}%` } },
      { OWNER_NAME: { [Op.like]: `%${search}%` } },
      { EMAIL: { [Op.like]: `%${search}%` } },
    ];
  }
  return Merchant.findAll({ where, order: [['ID', 'DESC']] });
}

async function stats() {
  const [total, active, suspended, pending] = await Promise.all([
    Merchant.count(),
    Merchant.count({ where: { STATUS: 'active' } }),
    Merchant.count({ where: { STATUS: 'suspended' } }),
    Merchant.count({ where: { STATUS: 'pending' } }),
  ]);
  return { total, active, suspended, pending };
}

async function getById(id) {
  const m = await Merchant.findByPk(id);
  if (!m) throw new ApiError(404, 'Merchant tidak ditemukan');
  return m;
}

async function updateStatus(id, status) {
  if (!ALLOWED_STATUS.includes(status)) throw new ApiError(422, 'Status tidak valid');
  const m = await getById(id);
  await m.update({ STATUS: status });
  return m;
}

// ===== Admin Merchant (toko sendiri) =====
// merchantId selalu dari token (req.user.merchant_id), bukan input.
async function getOwn(merchantId) {
  if (!merchantId) throw new ApiError(403, 'Akun tidak terhubung ke toko');
  return getById(merchantId);
}

async function updateOwn(merchantId, data) {
  const m = await getOwn(merchantId);

  // Slug katalog publik: normalisasi + pastikan unik (lintas merchant).
  let slug;
  if (data.slug !== undefined) {
    slug = String(data.slug).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
    if (!slug) throw new ApiError(422, 'Slug tidak valid');
    const dup = await Merchant.findOne({ where: { SLUG: slug, ID: { [Op.ne]: merchantId } } });
    if (dup) throw new ApiError(409, 'Slug sudah dipakai toko lain, pilih yang lain.');
  }

  const map = {
    NAMA: data.store_name ?? data.nama,
    OWNER_NAME: data.owner_name,
    PHONE: data.phone,
    ADDRESS: data.address,
    CITY: data.city,
    PROVINCE: data.province,
    BUSINESS_CATEGORY: data.business_category,
    INVOICE_PREFIX: data.invoice_prefix,
    SLUG: slug,
  };
  Object.keys(map).forEach((k) => { if (map[k] === undefined) delete map[k]; });
  await m.update(map);
  return m;
}

module.exports = { listAll, stats, getById, updateStatus, getOwn, updateOwn };
