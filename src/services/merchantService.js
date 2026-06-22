const { Op } = require('sequelize');
const { Merchant, Pengguna, Penjualan, PlanHistory } = require('../models');
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

/**
 * Super Admin: set plan merchant secara MANUAL (FREE/PRO) + masa aktif + catatan.
 * - PRO: wajib pro_expires_at (atau default +1 bulan dari pro_starts_at/sekarang).
 * - FREE: nonaktifkan PRO (kosongkan masa aktif).
 * - Setiap perubahan dicatat di m_plan_history (audit).
 * Fitur PRO langsung mengikuti nilai ini (effectivePlan membaca PLAN+PRO_EXPIRES_AT).
 */
async function setPlanManual(id, { plan, pro_starts_at, pro_expires_at, note }, changedBy) {
  const m = await getById(id);
  const oldPlan = m.PLAN;

  let starts = null;
  let expires = null;
  if (plan === 'PRO') {
    starts = pro_starts_at ? new Date(pro_starts_at) : new Date();
    if (pro_expires_at) {
      expires = new Date(pro_expires_at);
    } else {
      // default: 1 bulan dari tanggal mulai
      expires = new Date(starts);
      expires.setMonth(expires.getMonth() + 1);
    }
    if (expires <= new Date()) {
      throw new ApiError(422, 'Tanggal expired PRO harus di masa depan.');
    }
    await m.update({ PLAN: 'PRO', PRO_STARTS_AT: starts, PRO_EXPIRES_AT: expires });
  } else {
    // FREE: nonaktifkan PRO. PRO_EXPIRES_AT dikosongkan agar fitur kembali FREE.
    await m.update({ PLAN: 'FREE', PRO_EXPIRES_AT: null });
  }

  await PlanHistory.create({
    MERCHANT_ID: m.ID,
    OLD_PLAN: oldPlan,
    NEW_PLAN: plan,
    PRO_STARTS_AT: starts,
    PRO_EXPIRES_AT: expires,
    NOTE: note || null,
    SOURCE: 'MANUAL',
    CHANGED_BY: changedBy ?? null,
  });

  return m;
}

// Riwayat perubahan plan sebuah merchant (super admin).
async function planHistory(id) {
  return PlanHistory.findAll({ where: { MERCHANT_ID: id }, order: [['ID', 'DESC']] });
}

module.exports = {
  listAll, stats, getById, updateStatus, getOwn, updateOwn, setPlanManual, planHistory,
};
