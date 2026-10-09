const { Op, literal } = require('sequelize');
const {
  sequelize, SubscriptionSetting, SubscriptionPayment, Merchant, Pengguna, PlanHistory,
  SubscriptionVoucher, SubscriptionVoucherRedemption,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { activeMerchantId, getTenant, withMerchantScope } = require('../utils/tenancy');
const { effectivePlan, normalizePlan } = require('../utils/plan');
const { sendSubscriptionActivatedEmail } = require('../utils/mailer');
const env = require('../config/env');
const billingMidtrans = require('./billingMidtransService');

const ACTIVE_STATUS = ['PENDING'];
const FINAL_STATUS = ['PAID', 'EXPIRED', 'CANCELLED', 'FAILED'];

async function getSetting() {
  let row = await SubscriptionSetting.findByPk(1);
  if (!row) row = await SubscriptionSetting.create({ ID: 1 });
  return row;
}

async function updateSetting(data) {
  const row = await getSetting();
  const map = {
    PRICE_MONTHLY: data.price_monthly,
    PRICE_3_MONTHS: data.price_3_months,
    PRICE_6_MONTHS: data.price_6_months,
    PRICE_YEARLY: data.price_yearly,
    PRICE_BUSINESS_MONTHLY: data.price_business_monthly,
    PRICE_BUSINESS_YEARLY: data.price_business_yearly,
    PAYMENT_TTL_HOURS: data.payment_ttl_hours,
    MAINTENANCE_MODE: data.maintenance_mode === undefined ? undefined : (data.maintenance_mode ? 1 : 0),
    MAINTENANCE_MESSAGE: data.maintenance_message,
  };
  Object.keys(map).forEach((key) => { if (map[key] === undefined) delete map[key]; });
  await row.update(map);
  return row;
}

async function expireStale() {
  await SubscriptionPayment.update(
    { STATUS: 'EXPIRED' },
    { where: { STATUS: { [Op.in]: ACTIVE_STATUS }, EXPIRES_AT: { [Op.lt]: new Date() } } },
  );
}

// Paket PRO: BULANAN (1 bulan), 3_BULAN, 6_BULAN, TAHUNAN (12 bulan).
// Paket BUSINESS tetap 2 tier (bulanan/tahunan) — dipesan manual via WhatsApp,
// tidak lewat createPayment(), jadi cukup 2 opsi seperti semula.
function packagePrice(setting, targetPlan, paket) {
  if (targetPlan === 'BUSINESS') {
    return paket === 'TAHUNAN'
      ? Number(setting.PRICE_BUSINESS_YEARLY)
      : Number(setting.PRICE_BUSINESS_MONTHLY);
  }
  if (paket === 'TAHUNAN') return Number(setting.PRICE_YEARLY);
  if (paket === '6_BULAN') return Number(setting.PRICE_6_MONTHS);
  if (paket === '3_BULAN') return Number(setting.PRICE_3_MONTHS);
  return Number(setting.PRICE_MONTHLY); // BULANAN
}

function durationMonths(paket) {
  if (paket === 'TAHUNAN') return 12;
  if (paket === '6_BULAN') return 6;
  if (paket === '3_BULAN') return 3;
  return 1; // BULANAN
}

function extendExpiry(current, months) {
  const now = new Date();
  const base = current && new Date(current) > now ? new Date(current) : now;
  base.setMonth(base.getMonth() + Number(months || 1));
  return base;
}

async function activatePayment(paymentId, rawPayload, transactionId) {
  return sequelize.transaction(async (transaction) => {
    const row = await SubscriptionPayment.findByPk(paymentId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!row) throw new ApiError(404, 'Pembayaran billing tidak ditemukan.');
    if (row.STATUS === 'PAID') return row;

    const merchant = await Merchant.findByPk(row.MERCHANT_ID, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!merchant) throw new ApiError(404, 'Merchant pembayaran tidak ditemukan.');

    const targetPlan = row.TARGET_PLAN === 'BUSINESS' ? 'BUSINESS' : 'PRO';
    const startsAt = new Date();
    const newExpiry = extendExpiry(merchant.PRO_EXPIRES_AT, row.DURATION_MONTHS);
    const oldPlan = effectivePlan(merchant);

    await merchant.update({
      PLAN: targetPlan,
      PRO_STARTS_AT: startsAt,
      PRO_EXPIRES_AT: newExpiry,
    }, { transaction });

    await row.update({
      STATUS: 'PAID',
      PAID_AT: startsAt,
      VERIFIED_AT: startsAt,
      VERIFIED_BY: null,
      ACTIVATED_AT: startsAt,
      MIDTRANS_TRANSACTION_ID: transactionId || row.MIDTRANS_TRANSACTION_ID,
      LAST_NOTIFICATION: rawPayload ? JSON.stringify(rawPayload) : row.LAST_NOTIFICATION,
      REJECT_REASON: null,
    }, { transaction });

    await PlanHistory.create({
      MERCHANT_ID: merchant.ID,
      OLD_PLAN: oldPlan,
      NEW_PLAN: targetPlan,
      PRO_STARTS_AT: startsAt,
      PRO_EXPIRES_AT: newExpiry,
      NOTE: `Aktivasi otomatis dari pembayaran ${row.MIDTRANS_ORDER_ID}`,
      SOURCE: 'PAYMENT',
      CHANGED_BY: null,
    }, { transaction });

    transaction.afterCommit(() => {
      if (merchant.EMAIL) {
        sendSubscriptionActivatedEmail(merchant.EMAIL, {
          storeName: merchant.NAMA,
          paket: `${targetPlan} ${row.PAKET}`,
          expiresAt: newExpiry,
        }).catch(() => {});
      }
    });

    return row;
  });
}

async function applyGatewayStatus(row, status, rawPayload, transactionId) {
  if (row.STATUS === 'PAID') return row;
  if (status === 'PAID') return activatePayment(row.ID, rawPayload, transactionId);
  if (!FINAL_STATUS.includes(status) && status !== 'PENDING') return row;

  await row.update({
    STATUS: status,
    MIDTRANS_TRANSACTION_ID: transactionId || row.MIDTRANS_TRANSACTION_ID,
    LAST_NOTIFICATION: rawPayload ? JSON.stringify(rawPayload) : row.LAST_NOTIFICATION,
    REJECT_REASON: status === 'FAILED' ? 'Pembayaran ditolak atau gagal di Midtrans.' : null,
  });
  return row;
}

async function createPayment({ plan, paket }) {
  await expireStale();
  const merchantId = activeMerchantId();
  if (!merchantId) throw new ApiError(403, 'Pembayaran upgrade hanya dapat dibuat oleh merchant login.');
  if (plan === 'BUSINESS') {
    throw new ApiError(422, 'Untuk upgrade atau perpanjang paket BUSINESS, hubungi kami melalui WhatsApp +62 859-1069-97680.');
  }

  const setting = await getSetting();
  const targetPlan = plan === 'BUSINESS' ? 'BUSINESS' : 'PRO';
  const price = packagePrice(setting, targetPlan, paket);
  if (!price || price <= 0) throw new ApiError(400, `Harga ${targetPlan} ${paket.toLowerCase()} belum diatur.`);

  const active = await SubscriptionPayment.findOne({ where: { STATUS: { [Op.in]: ACTIVE_STATUS } } });
  if (active) throw new ApiError(409, 'Masih ada pembayaran upgrade yang menunggu. Selesaikan atau tunggu kedaluwarsa.');

  // Memvalidasi seluruh ENV billing sebelum membuat row pembayaran.
  billingMidtrans.gatewaySetting();
  const ttlHours = Number(setting.PAYMENT_TTL_HOURS || 24);
  const { userId } = getTenant();
  const merchant = await Merchant.findByPk(merchantId);

  const row = await SubscriptionPayment.create({
    PAKET: paket,
    TARGET_PLAN: targetPlan,
    DURATION_MONTHS: durationMonths(paket),
    HARGA: price,
    KODE_UNIK: 0,
    TOTAL_BAYAR: price,
    STATUS: 'PENDING',
    PROVIDER: 'midtrans',
    GATEWAY_MERCHANT_ID: env.billingMidtrans.merchantId,
    EXPIRES_AT: new Date(Date.now() + ttlHours * 3600 * 1000),
    ID_USER: userId ?? null,
  });

  const orderId = billingMidtrans.buildOrderId(merchantId, row.ID);
  await row.update({ MIDTRANS_ORDER_ID: orderId });

  try {
    const snap = await billingMidtrans.createSnapTransaction({
      orderId,
      grossAmount: price,
      customerName: merchant ? merchant.NAMA : undefined,
      expiryMinutes: ttlHours * 60,
      itemDetails: [{
        id: `SUB-${targetPlan}-${paket}`,
        price,
        quantity: 1,
        name: `Upgrade ${targetPlan} ${paket}`.slice(0, 50),
      }],
    });
    await row.update({
      SNAP_TOKEN: snap.token,
      SNAP_REDIRECT_URL: snap.redirectUrl,
      RAW_RESPONSE: JSON.stringify(snap.raw),
    });
    return row;
  } catch (error) {
    await row.update({
      STATUS: 'FAILED',
      REJECT_REASON: error.message || 'Gagal membuat transaksi Snap Midtrans.',
      RAW_RESPONSE: JSON.stringify(error.raw || { message: error.message }),
    });
    throw error;
  }
}

async function getPaymentStatus(id) {
  await expireStale();
  let row = await SubscriptionPayment.findByPk(id);
  if (!row) throw new ApiError(404, 'Pembayaran tidak ditemukan.');
  if (row.PROVIDER !== 'midtrans' || FINAL_STATUS.includes(row.STATUS) || !row.MIDTRANS_ORDER_ID) return row;

  const fresh = await billingMidtrans.getStatus(row.MIDTRANS_ORDER_ID);
  if (fresh && fresh.transactionStatus) {
    const mapped = billingMidtrans.mapStatus(fresh.transactionStatus, fresh.fraudStatus);
    row = await applyGatewayStatus(row, mapped, fresh.raw, fresh.transactionId);
  }
  return SubscriptionPayment.findByPk(row.ID);
}

// Merchant membatalkan tagihan yang belum dibayar, agar bisa langsung buat tagihan
// baru tanpa menunggu kedaluwarsa otomatis (createPayment menolak bila masih ada PENDING).
async function cancelPayment(id) {
  const row = await SubscriptionPayment.findByPk(id);
  if (!row) throw new ApiError(404, 'Pembayaran tidak ditemukan.');
  if (row.STATUS !== 'PENDING') throw new ApiError(400, 'Hanya pembayaran yang masih menunggu yang bisa dibatalkan.');

  if (row.PROVIDER === 'midtrans' && row.MIDTRANS_ORDER_ID) {
    try { await billingMidtrans.cancelTransaction(row.MIDTRANS_ORDER_ID); } catch (_) { /* abaikan, tetap batalkan lokal */ }
  }
  await row.update({ STATUS: 'CANCELLED', REJECT_REASON: 'Dibatalkan oleh merchant.' });
  return row;
}

async function handleNotification(body) {
  const parsed = billingMidtrans.parseOrderId(body.order_id);
  if (!parsed) throw new ApiError(400, 'order_id billing tidak valid.');

  const signatureValid = billingMidtrans.verifySignature({
    orderId: body.order_id,
    statusCode: body.status_code,
    grossAmount: body.gross_amount,
    signatureKey: body.signature_key,
  });
  if (!signatureValid) throw new ApiError(403, 'Signature Midtrans billing tidak valid.');

  return withMerchantScope(parsed.merchantId, async () => {
    const row = await SubscriptionPayment.findOne({ where: { ID: parsed.paymentId, MIDTRANS_ORDER_ID: body.order_id } });
    if (!row || row.MERCHANT_ID !== parsed.merchantId) throw new ApiError(404, 'Pembayaran billing tidak ditemukan.');

    const mapped = billingMidtrans.mapStatus(body.transaction_status, body.fraud_status);
    await applyGatewayStatus(row, mapped, body, body.transaction_id);
    return { order_id: body.order_id, payment_status: mapped };
  });
}

async function billing() {
  await expireStale();
  const merchantId = activeMerchantId();
  const merchant = merchantId ? await Merchant.findByPk(merchantId) : null;
  if (merchant) await normalizePlan(merchant);
  const payments = await SubscriptionPayment.findAll({ order: [['ID', 'DESC']] });
  return {
    plan: merchant ? effectivePlan(merchant) : 'FREE',
    pro_expires_at: merchant ? merchant.PRO_EXPIRES_AT : null,
    status_toko: merchant ? merchant.STATUS : null,
    payments,
    latest: payments[0] || null,
    // Client key Midtrans bersifat publik (bukan rahasia) - dibutuhkan frontend untuk memuat Snap.js.
    midtrans_client_key: env.billingMidtrans.clientKey,
    midtrans_is_production: env.billingMidtrans.isProduction,
  };
}

async function listAllPayments({ status } = {}) {
  await expireStale();
  const where = {};
  if (status) where.STATUS = status;
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
  if (!row) throw new ApiError(404, 'Pembayaran tidak ditemukan.');
  return row;
}

// ===== Voucher Redeem (Super Admin kelola kode, Merchant redeem) =====
// Redeem LANGSUNG memperpanjang PRO_EXPIRES_AT sejumlah durasi PAKET voucher,
// tanpa lewat pembayaran Midtrans. Beda dengan voucherService (diskon POS).

async function listVouchers() {
  return SubscriptionVoucher.findAll({ order: [['ID', 'DESC']] });
}

async function createVoucher(data, userId) {
  const kode = String(data.kode || '').trim().toUpperCase();
  const exists = await SubscriptionVoucher.findOne({ where: { KODE: kode } });
  if (exists) throw new ApiError(409, 'Kode voucher sudah dipakai.');
  return SubscriptionVoucher.create({
    KODE: kode,
    TARGET_PLAN: data.target_plan || 'PRO',
    PAKET: data.paket,
    MAX_REDEMPTIONS: data.max_redemptions ?? null,
    VALID_FROM: data.valid_from || null,
    VALID_UNTIL: data.valid_until || null,
    IS_ACTIVE: data.is_active !== undefined ? data.is_active : true,
    NOTE: data.note || null,
    CREATED_BY: userId ?? null,
  });
}

async function updateVoucher(id, data) {
  const v = await SubscriptionVoucher.findByPk(id);
  if (!v) throw new ApiError(404, 'Voucher tidak ditemukan.');
  const map = {
    TARGET_PLAN: data.target_plan,
    PAKET: data.paket,
    MAX_REDEMPTIONS: data.max_redemptions,
    VALID_FROM: data.valid_from,
    VALID_UNTIL: data.valid_until,
    IS_ACTIVE: data.is_active,
    NOTE: data.note,
  };
  if (data.kode !== undefined) map.KODE = String(data.kode).trim().toUpperCase();
  Object.keys(map).forEach((k) => { if (map[k] === undefined) delete map[k]; });
  await v.update(map);
  return v;
}

async function removeVoucher(id) {
  const v = await SubscriptionVoucher.findByPk(id);
  if (!v) throw new ApiError(404, 'Voucher tidak ditemukan.');
  if (v.USED_COUNT > 0) throw new ApiError(400, 'Voucher sudah pernah dipakai, tidak bisa dihapus. Nonaktifkan saja.');
  await v.destroy();
  return true;
}

async function listVoucherRedemptions(id) {
  const v = await SubscriptionVoucher.findByPk(id);
  if (!v) throw new ApiError(404, 'Voucher tidak ditemukan.');
  return SubscriptionVoucherRedemption.findAll({
    where: { ID_VOUCHER: id },
    include: [{ model: Merchant, as: 'merchant', attributes: ['ID', 'NAMA', 'EMAIL'] }],
    order: [['ID', 'DESC']],
  });
}

// Merchant redeem kode voucher - 1 merchant hanya bisa redeem 1x per kode
// (ditegakkan UNIQUE(ID_VOUCHER, MERCHANT_ID) di DB, lihat migration).
async function redeemVoucher(kode) {
  const merchantId = activeMerchantId();
  if (!merchantId) throw new ApiError(403, 'Redeem voucher hanya dapat dilakukan oleh merchant login.');
  const code = String(kode || '').trim().toUpperCase();

  return sequelize.transaction(async (transaction) => {
    const voucher = await SubscriptionVoucher.findOne({
      where: { KODE: code }, transaction, lock: transaction.LOCK.UPDATE,
    });
    if (!voucher) throw new ApiError(404, 'Kode voucher tidak ditemukan.');
    if (!voucher.IS_ACTIVE) throw new ApiError(400, 'Voucher tidak aktif.');

    const today = new Date().toISOString().slice(0, 10);
    if (voucher.VALID_FROM && today < voucher.VALID_FROM) throw new ApiError(400, 'Voucher belum berlaku.');
    if (voucher.VALID_UNTIL && today > voucher.VALID_UNTIL) throw new ApiError(400, 'Voucher sudah kedaluwarsa.');
    if (voucher.MAX_REDEMPTIONS != null && voucher.USED_COUNT >= voucher.MAX_REDEMPTIONS) {
      throw new ApiError(400, 'Kuota voucher sudah habis.');
    }

    const already = await SubscriptionVoucherRedemption.findOne({
      where: { ID_VOUCHER: voucher.ID, MERCHANT_ID: merchantId }, transaction,
    });
    if (already) throw new ApiError(409, 'Voucher ini sudah pernah dipakai toko Anda.');

    const merchant = await Merchant.findByPk(merchantId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!merchant) throw new ApiError(404, 'Merchant tidak ditemukan.');

    const targetPlan = voucher.TARGET_PLAN === 'BUSINESS' ? 'BUSINESS' : 'PRO';
    const months = durationMonths(voucher.PAKET);
    const startsAt = new Date();
    const newExpiry = extendExpiry(merchant.PRO_EXPIRES_AT, months);
    const oldPlan = effectivePlan(merchant);

    await merchant.update({
      PLAN: targetPlan,
      PRO_STARTS_AT: startsAt,
      PRO_EXPIRES_AT: newExpiry,
    }, { transaction });

    await SubscriptionVoucherRedemption.create({
      ID_VOUCHER: voucher.ID,
      MERCHANT_ID: merchantId,
      TARGET_PLAN: targetPlan,
      PAKET: voucher.PAKET,
      DURATION_MONTHS: months,
      PRO_EXPIRES_AT: newExpiry,
    }, { transaction });

    await voucher.update({ USED_COUNT: voucher.USED_COUNT + 1 }, { transaction });

    await PlanHistory.create({
      MERCHANT_ID: merchant.ID,
      OLD_PLAN: oldPlan,
      NEW_PLAN: targetPlan,
      PRO_STARTS_AT: startsAt,
      PRO_EXPIRES_AT: newExpiry,
      NOTE: `Redeem voucher ${voucher.KODE}`,
      SOURCE: 'VOUCHER',
      CHANGED_BY: null,
    }, { transaction });

    transaction.afterCommit(() => {
      if (merchant.EMAIL) {
        sendSubscriptionActivatedEmail(merchant.EMAIL, {
          storeName: merchant.NAMA,
          paket: `${targetPlan} ${voucher.PAKET}`,
          expiresAt: newExpiry,
        }).catch(() => {});
      }
    });

    return { plan: targetPlan, paket: voucher.PAKET, pro_expires_at: newExpiry };
  });
}

// Joi.date().iso() meng-koersi query string 'YYYY-MM-DD' menjadi objek Date —
// normalisasi balik ke 'YYYY-MM-DD' (pakai komponen UTC, karena itulah yang
// dipakai Joi saat parsing) sebelum dirakit jadi string batas awal/akhir hari.
// Tanpa ini, template literal `${date}` menghasilkan string Date.toString()
// yang tidak valid untuk MySQL (lihat pola sama di kasShiftService.dayBounds).
function toYMD(value) {
  if (value instanceof Date) {
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
  }
  return String(value).slice(0, 10);
}

// ===== Laporan Pendapatan (Super Admin) =====
// Pendapatan platform dari pembayaran upgrade PRO/BUSINESS yang LUNAS (STATUS=PAID),
// lintas seluruh merchant. Read-only, tidak mengubah alur pembayaran manapun.
async function revenueSummary({ tanggal_awal, tanggal_akhir } = {}) {
  const where = { STATUS: 'PAID' };
  if (tanggal_awal && tanggal_akhir) {
    where.PAID_AT = { [Op.between]: [`${toYMD(tanggal_awal)} 00:00:00`, `${toYMD(tanggal_akhir)} 23:59:59`] };
  }
  const payments = await SubscriptionPayment.findAll({
    where,
    include: [{ model: Merchant, as: 'merchant', attributes: ['ID', 'NAMA'] }],
    order: [['PAID_AT', 'DESC']],
  });

  const byPlanMap = new Map();
  let total_revenue = 0;
  payments.forEach((p) => {
    total_revenue += Number(p.TOTAL_BAYAR) || 0;
    const key = `${p.TARGET_PLAN || 'PRO'}_${p.PAKET || 'BULANAN'}`;
    const current = byPlanMap.get(key) || { plan: p.TARGET_PLAN || 'PRO', paket: p.PAKET, jumlah: 0, total: 0 };
    current.jumlah += 1;
    current.total += Number(p.TOTAL_BAYAR) || 0;
    byPlanMap.set(key, current);
  });

  return {
    filter: { tanggal_awal, tanggal_akhir },
    total_revenue,
    jumlah_pembayaran: payments.length,
    by_plan: Array.from(byPlanMap.values()),
    payments,
  };
}

// Grafik pendapatan bulanan (1 tahun) — dipakai chart laporan pendapatan.
async function revenueChart(tahun) {
  const selectedYear = Number(tahun) || new Date().getFullYear();
  const data = Array.from({ length: 12 }, (_, i) => ({ bulan: i + 1, revenue: 0 }));
  const rows = await SubscriptionPayment.findAll({
    attributes: [
      [literal('MONTH(`PAID_AT`)'), 'bulan'],
      [literal('COALESCE(SUM(`TOTAL_BAYAR`), 0)'), 'revenue'],
    ],
    where: {
      STATUS: 'PAID',
      PAID_AT: { [Op.between]: [`${selectedYear}-01-01 00:00:00`, `${selectedYear}-12-31 23:59:59`] },
    },
    group: [literal('MONTH(`PAID_AT`)')],
    raw: true,
  });
  rows.forEach((r) => {
    const idx = Number(r.bulan) - 1;
    if (data[idx]) data[idx].revenue = Number(r.revenue) || 0;
  });
  return { tahun: selectedYear, data };
}

module.exports = {
  getSetting,
  updateSetting,
  createPayment,
  getPaymentStatus,
  cancelPayment,
  handleNotification,
  billing,
  listAllPayments,
  getPaymentAdmin,
  revenueSummary,
  revenueChart,
  listVouchers,
  createVoucher,
  updateVoucher,
  removeVoucher,
  listVoucherRedemptions,
  redeemVoucher,
};
