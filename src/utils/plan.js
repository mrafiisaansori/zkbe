const { Merchant } = require('../models');
const { activeMerchantId, getTenant } = require('./tenancy');

// Batas plan FREE.
const FREE_MAX_PRODUK = 5;
const FREE_MAX_KASIR = 1; // jumlah user LEVEL kasir (2)
const FREE_REPORT_MAX_DAYS = 30; // laporan FREE hanya 30 hari terakhir (spt Qasir Free)

// Daftar plan berbayar yang mendapatkan SELURUH fitur PRO.
// BUSINESS = superset dari PRO (semua fitur PRO + payment gateway Midtrans).
const PAID_PLANS = ['PRO', 'BUSINESS'];
const PRO_UPGRADE_MESSAGE = 'Fitur Voucher, Pajak, dan Service Charge tersedia untuk paket PRO. Upgrade sekarang untuk mengelola promo dan biaya layanan dengan lebih profesional.';

/**
 * Plan efektif sebuah merchant dengan mempertimbangkan masa aktif.
 * LOGIC EXPIRED (paling aman): jika PLAN berbayar (PRO/BUSINESS) tapi
 * PRO_EXPIRES_AT sudah lewat, merchant diperlakukan sebagai 'FREE'.
 * Mengembalikan salah satu dari: 'FREE' | 'PRO' | 'BUSINESS'.
 */
function effectivePlan(merchant) {
  if (!merchant) return 'FREE';
  if (!PAID_PLANS.includes(merchant.PLAN)) return 'FREE';
  if (merchant.PRO_EXPIRES_AT && new Date(merchant.PRO_EXPIRES_AT) < new Date()) return 'FREE';
  return merchant.PLAN; // 'PRO' atau 'BUSINESS'
}

/**
 * Apakah plan ini memperoleh fitur-fitur PRO (Open Bill, voucher, multi kasir,
 * laporan lengkap, struk tanpa branding, dll)? BUSINESS termasuk di dalamnya.
 */
function hasProFeatures(plan) {
  return plan === 'PRO' || plan === 'BUSINESS';
}

// Apakah plan ini BUSINESS (akses payment gateway Midtrans QRIS dinamis)?
function isBusiness(plan) {
  return plan === 'BUSINESS';
}

/**
 * Normalisasi plan di DB (lazy downgrade): bila plan berbayar sudah expired,
 * set PLAN='FREE' (PRO_EXPIRES_AT tetap disimpan untuk histori).
 * Mengembalikan plan efektif.
 */
async function normalizePlan(merchant) {
  if (!merchant) return 'FREE';
  const eff = effectivePlan(merchant);
  if (PAID_PLANS.includes(merchant.PLAN) && eff === 'FREE') {
    try { await merchant.update({ PLAN: 'FREE' }); } catch (_) { /* abaikan */ }
  }
  return eff;
}

// Ambil merchant dari sesi login (tenant). null untuk super admin.
async function currentMerchant() {
  const mid = activeMerchantId();
  if (mid === undefined) {
    // super admin / tanpa scope: coba pakai merchantId mentah bila ada.
    const { merchantId } = getTenant();
    if (!merchantId) return null;
    return Merchant.findByPk(merchantId);
  }
  return Merchant.findByPk(mid);
}

// Plan efektif untuk sesi saat ini (super admin dianggap BUSINESS/tanpa batas).
async function currentPlan() {
  const { superadmin } = getTenant();
  if (superadmin) return 'BUSINESS';
  const m = await currentMerchant();
  return effectivePlan(m);
}

async function assertProFeature(message = PRO_UPGRADE_MESSAGE) {
  const plan = await currentPlan();
  if (!hasProFeatures(plan)) {
    const ApiError = require('./ApiError');
    throw new ApiError(403, message);
  }
  return plan;
}

// Tanggal terlama yang boleh dilihat plan FREE pada laporan (hari ini - 30 hari, jam 00:00).
function reportCutoffDate() {
  const d = new Date();
  d.setDate(d.getDate() - FREE_REPORT_MAX_DAYS);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Batasi tanggal_awal laporan (penjualan/pendapatan/closing kasir) untuk plan FREE:
 * hanya boleh melihat FREE_REPORT_MAX_DAYS hari terakhir. PRO/BUSINESS tanpa batas.
 * Dipanggil di service laporan yang mewajibkan tanggal_awal.
 */
async function assertReportDateAllowed(tanggalAwal) {
  const plan = await currentPlan();
  if (hasProFeatures(plan) || !tanggalAwal) return plan;
  if (new Date(tanggalAwal) < reportCutoffDate()) {
    const ApiError = require('./ApiError');
    throw new ApiError(403, `Plan FREE hanya bisa melihat laporan ${FREE_REPORT_MAX_DAYS} hari terakhir. Upgrade ke PRO untuk melihat laporan lengkap.`);
  }
  return plan;
}

module.exports = {
  FREE_MAX_PRODUK,
  FREE_MAX_KASIR,
  FREE_REPORT_MAX_DAYS,
  PAID_PLANS,
  effectivePlan,
  hasProFeatures,
  isBusiness,
  normalizePlan,
  currentMerchant,
  currentPlan,
  assertProFeature,
  reportCutoffDate,
  assertReportDateAllowed,
  PRO_UPGRADE_MESSAGE,
};
