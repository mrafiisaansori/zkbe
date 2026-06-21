const { Op } = require('sequelize');
const {
  sequelize, SubscriptionSetting, SubscriptionPayment, Merchant, Pengguna,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { activeMerchantId, getTenant } = require('../utils/tenancy');
const { effectivePlan, normalizePlan } = require('../utils/plan');
const { sendSubscriptionActivatedEmail } = require('../utils/mailer');

const ACTIVE_STATUS = ['PENDING', 'WAITING_VERIFICATION'];

// ===== Pengaturan langganan (global, super admin) =====
async function getSetting() {
  let row = await SubscriptionSetting.findByPk(1);
  if (!row) row = await SubscriptionSetting.create({ ID: 1 });
  return row;
}

async function updateSetting(data, imagePath) {
  const row = await getSetting();
  const map = {
    QRIS_LABEL: data.qris_label,
    PRICE_MONTHLY: data.price_monthly,
    PRICE_YEARLY: data.price_yearly,
    PAYMENT_TTL_HOURS: data.payment_ttl_hours,
  };
  if (imagePath) map.QRIS_IMAGE = imagePath;
  Object.keys(map).forEach((k) => { if (map[k] === undefined) delete map[k]; });
  await row.update(map);
  return row;
}

// Tandai pembayaran yang melewati EXPIRES_AT sebagai EXPIRED (housekeeping lazy).
async function expireStale() {
  await SubscriptionPayment.update(
    { STATUS: 'EXPIRED' },
    { where: { STATUS: { [Op.in]: ACTIVE_STATUS }, EXPIRES_AT: { [Op.lt]: new Date() } } },
  );
}

// Generate kode unik 3 digit (100-999) yang TIDAK dipakai pembayaran aktif lain
// (lintas merchant) karena QRIS yang dipakai adalah open QRIS bersama.
async function generateUniqueCode() {
  const [rows] = await sequelize.query(
    `SELECT KODE_UNIK FROM m_subscription_payment
     WHERE STATUS IN ('PENDING','WAITING_VERIFICATION') AND EXPIRES_AT > NOW()`,
  );
  const used = new Set((rows || []).map((r) => Number(r.KODE_UNIK)));
  if (used.size >= 900) throw new ApiError(503, 'Sistem sibuk, coba lagi nanti.');
  let code;
  do { code = 100 + Math.floor(Math.random() * 900); } while (used.has(code));
  return code;
}

// ===== Merchant: buat pembayaran langganan =====
async function createPayment({ paket }) {
  await expireStale();
  const setting = await getSetting();
  const harga = paket === 'TAHUNAN' ? Number(setting.PRICE_YEARLY) : Number(setting.PRICE_MONTHLY);
  if (!harga || harga <= 0) throw new ApiError(400, 'Harga paket belum diatur oleh admin Zona Kasir.');

  // Cegah pembayaran ganda yang masih aktif.
  const aktif = await SubscriptionPayment.findOne({ where: { STATUS: { [Op.in]: ACTIVE_STATUS } } });
  if (aktif) throw new ApiError(409, 'Masih ada pembayaran langganan yang menunggu. Selesaikan atau batalkan dulu.');

  const code = await generateUniqueCode();
  const ttlH = Number(setting.PAYMENT_TTL_HOURS || 24);
  const { userId } = getTenant();

  const row = await SubscriptionPayment.create({
    PAKET: paket,
    HARGA: harga,
    KODE_UNIK: code,
    TOTAL_BAYAR: harga + code,
    STATUS: 'PENDING',
    EXPIRES_AT: new Date(Date.now() + ttlH * 3600 * 1000),
    ID_USER: userId ?? null,
  });
  return row;
}

// Merchant submit / upload bukti -> WAITING_VERIFICATION.
async function submitPayment(id, buktiPath) {
  const row = await SubscriptionPayment.findByPk(id); // ter-scope merchant
  if (!row) throw new ApiError(404, 'Pembayaran tidak ditemukan');
  if (row.STATUS !== 'PENDING') throw new ApiError(400, `Pembayaran berstatus ${row.STATUS} tidak dapat disubmit`);
  if (row.EXPIRES_AT && new Date(row.EXPIRES_AT) < new Date()) {
    await row.update({ STATUS: 'EXPIRED' });
    throw new ApiError(400, 'Waktu pembayaran sudah habis. Buat pembayaran baru.');
  }
  await row.update({ STATUS: 'WAITING_VERIFICATION', BUKTI: buktiPath || row.BUKTI, PAID_AT: new Date() });
  return row;
}

// Merchant: status billing (plan, masa aktif, riwayat).
async function billing() {
  await expireStale();
  const mid = activeMerchantId();
  const merchant = mid ? await Merchant.findByPk(mid) : null;
  if (merchant) await normalizePlan(merchant);
  const payments = await SubscriptionPayment.findAll({ order: [['ID', 'DESC']] });
  return {
    plan: merchant ? effectivePlan(merchant) : 'FREE',
    pro_expires_at: merchant ? merchant.PRO_EXPIRES_AT : null,
    status_toko: merchant ? merchant.STATUS : null,
    payments,
    latest: payments[0] || null,
  };
}

async function listOwnPayments() {
  await expireStale();
  return SubscriptionPayment.findAll({ order: [['ID', 'DESC']] });
}

// ===== Super admin =====
async function listAllPayments({ status } = {}) {
  await expireStale();
  const where = {};
  if (status) where.STATUS = status;
  // Super admin: tidak ter-scope (lihat semua merchant).
  return SubscriptionPayment.findAll({
    where,
    include: [{ model: Merchant, as: 'merchant', attributes: ['ID', 'NAMA', 'EMAIL', 'PLAN', 'PRO_EXPIRES_AT'] }],
    order: [['ID', 'DESC']],
  });
}

async function getPaymentAdmin(id) {
  const row = await SubscriptionPayment.findByPk(id, {
    include: [
      { model: Merchant, as: 'merchant', attributes: ['ID', 'NAMA', 'EMAIL', 'PLAN', 'PRO_EXPIRES_AT'] },
      { model: Pengguna, as: 'pemohon', attributes: ['ID', 'NAMA'] },
    ],
  });
  if (!row) throw new ApiError(404, 'Pembayaran tidak ditemukan');
  return row;
}

// Tambah masa aktif: 1 bulan / 1 tahun dari max(now, masa aktif sekarang).
function extendExpiry(current, paket) {
  const base = current && new Date(current) > new Date() ? new Date(current) : new Date();
  if (paket === 'TAHUNAN') base.setFullYear(base.getFullYear() + 1);
  else base.setMonth(base.getMonth() + 1);
  return base;
}

async function verifyPayment(id, adminId) {
  return sequelize.transaction(async (t) => {
    const row = await SubscriptionPayment.findByPk(id, { transaction: t });
    if (!row) throw new ApiError(404, 'Pembayaran tidak ditemukan');
    if (row.STATUS === 'VERIFIED') throw new ApiError(400, 'Pembayaran sudah diverifikasi');

    const merchant = await Merchant.findByPk(row.MERCHANT_ID, { transaction: t });
    if (!merchant) throw new ApiError(404, 'Merchant tidak ditemukan');

    const newExpiry = extendExpiry(merchant.PRO_EXPIRES_AT, row.PAKET);
    await merchant.update({ PLAN: 'PRO', PRO_EXPIRES_AT: newExpiry }, { transaction: t });
    await row.update({
      STATUS: 'VERIFIED', VERIFIED_AT: new Date(), VERIFIED_BY: adminId, REJECT_REASON: null,
    }, { transaction: t });

    // Kirim email konfirmasi PRO aktif ke merchant (best-effort, di luar jalur gagal).
    if (merchant.EMAIL) {
      sendSubscriptionActivatedEmail(merchant.EMAIL, {
        storeName: merchant.NAMA, paket: row.PAKET, expiresAt: newExpiry,
      }).catch(() => {});
    }
    return { payment: row, pro_expires_at: newExpiry };
  });
}

async function rejectPayment(id, reason) {
  const row = await SubscriptionPayment.findByPk(id);
  if (!row) throw new ApiError(404, 'Pembayaran tidak ditemukan');
  if (row.STATUS === 'VERIFIED') throw new ApiError(400, 'Pembayaran sudah diverifikasi, tidak bisa ditolak');
  await row.update({ STATUS: 'REJECTED', REJECT_REASON: reason || 'Pembayaran ditolak' });
  return row;
}

module.exports = {
  getSetting, updateSetting,
  createPayment, submitPayment, billing, listOwnPayments,
  listAllPayments, getPaymentAdmin, verifyPayment, rejectPayment,
};
