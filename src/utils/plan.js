const { Merchant } = require('../models');
const { activeMerchantId, getTenant } = require('./tenancy');

// Batas plan FREE.
const FREE_MAX_PRODUK = 50;
const FREE_MAX_KASIR = 1; // jumlah user LEVEL kasir (2)

/**
 * Plan efektif sebuah merchant dengan mempertimbangkan masa aktif.
 * LOGIC EXPIRED (paling aman): jika PLAN='PRO' tapi PRO_EXPIRES_AT sudah lewat,
 * merchant diperlakukan sebagai 'FREE'.
 */
function effectivePlan(merchant) {
  if (!merchant) return 'FREE';
  if (merchant.PLAN !== 'PRO') return 'FREE';
  if (merchant.PRO_EXPIRES_AT && new Date(merchant.PRO_EXPIRES_AT) < new Date()) return 'FREE';
  return 'PRO';
}

/**
 * Normalisasi plan di DB (lazy downgrade): bila PRO sudah expired, set PLAN='FREE'
 * (PRO_EXPIRES_AT tetap disimpan untuk histori). Mengembalikan plan efektif.
 */
async function normalizePlan(merchant) {
  if (!merchant) return 'FREE';
  const eff = effectivePlan(merchant);
  if (merchant.PLAN === 'PRO' && eff === 'FREE') {
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

// Plan efektif untuk sesi saat ini (super admin dianggap PRO/tanpa batas).
async function currentPlan() {
  const { superadmin } = getTenant();
  if (superadmin) return 'PRO';
  const m = await currentMerchant();
  return effectivePlan(m);
}

module.exports = {
  FREE_MAX_PRODUK,
  FREE_MAX_KASIR,
  effectivePlan,
  normalizePlan,
  currentMerchant,
  currentPlan,
};
