const {
  Penjualan, PaymentGatewaySetting, PaymentLog, PaymentWebhookLog, Merchant,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { activeMerchantId, withMerchantScope } = require('../utils/tenancy');
const { currentPlan, isBusiness } = require('../utils/plan');
const penjualanService = require('./penjualanService');
const midtrans = require('./midtransService');

// Hanya merchant BUSINESS yang boleh memakai QRIS dinamis Midtrans.
// Divalidasi di BACKEND (bukan sekadar UI). merchant_id selalu dari token login.
async function assertBusiness() {
  const plan = await currentPlan();
  if (!isBusiness(plan)) {
    throw new ApiError(403, 'Pembayaran QRIS Midtrans hanya tersedia untuk merchant plan BUSINESS. Upgrade ke BUSINESS untuk mengaktifkannya.');
  }
}

// Ambil pengaturan gateway merchant aktif (boleh null -> fallback ENV global).
async function getSetting() {
  return PaymentGatewaySetting.findOne();
}

// order_id unik: ZK-{MERCHANT_ID}-{TRANSACTION_ID}-{TIMESTAMP}.
function buildOrderId(merchantId, transactionId) {
  return `ZK-${merchantId}-${transactionId}-${Date.now()}`;
}

// Parse order_id -> { merchantId, transactionId }. null jika format tidak cocok.
function parseOrderId(orderId) {
  const m = /^ZK-(\d+)-(\d+)-(\d+)$/.exec(String(orderId || ''));
  if (!m) return null;
  return { merchantId: Number(m[1]), transactionId: Number(m[2]) };
}

/**
 * POST /api/payments/midtrans/qris/create
 * 1. Validasi plan BUSINESS.
 * 2. Buat transaksi penjualan (reserve stok) status bayar PENDING.
 * 3. Minta QRIS dinamis ke Midtrans sesuai nominal transaksi.
 * 4. Kembalikan qr_string/qr_url untuk ditampilkan kasir.
 * Jika gagal membuat QRIS -> transaksi di-void (stok dikembalikan).
 */
async function createQris(payload) {
  await assertBusiness();
  const merchantId = activeMerchantId();
  if (!merchantId) throw new ApiError(400, 'Konteks merchant tidak ditemukan.');

  const setting = await getSetting();

  // 1) Buat transaksi (reserve stok) dengan status bayar PENDING.
  const trx = await penjualanService.checkout({
    items: payload.items,
    id_jenis_bayar: payload.id_jenis_bayar,
    id_user: payload.id_user,
    diskon: payload.diskon || 0,
    keterangan: payload.keterangan || 'Pembayaran QRIS Midtrans',
    kode_voucher: payload.kode_voucher,
    payment: { provider: 'midtrans', status: 'PENDING', status_bayar: 'PENDING' },
  });

  const orderId = buildOrderId(merchantId, trx.id);

  // Simpan order_id lebih dulu agar webhook tetap bisa mencocokkan walau charge timeout.
  await Penjualan.update(
    { MIDTRANS_ORDER_ID: orderId, PAYMENT_STATUS: 'PENDING' },
    { where: { ID: trx.id } },
  );

  await PaymentLog.create({
    ID_PENJUALAN: trx.id, PROVIDER: 'midtrans', ORDER_ID: orderId,
    EVENT: 'charge_request', PAYMENT_STATUS: 'PENDING', AMOUNT: trx.total,
    RAW: JSON.stringify({ order_id: orderId, gross_amount: trx.total, no_nota: trx.no_nota }),
  });

  try {
    const charge = await midtrans.chargeQris({
      orderId, grossAmount: trx.total, customerName: payload.customer_name, setting,
    });

    const expiredAt = charge.expiryTime ? new Date(charge.expiryTime.replace(' ', 'T')) : null;
    await Penjualan.update(
      {
        MIDTRANS_TRANSACTION_ID: charge.transactionId,
        PAYMENT_STATUS: 'PENDING',
        EXPIRED_AT: Number.isNaN(expiredAt?.getTime()) ? null : expiredAt,
      },
      { where: { ID: trx.id } },
    );

    await PaymentLog.create({
      ID_PENJUALAN: trx.id, PROVIDER: 'midtrans', ORDER_ID: orderId,
      TRANSACTION_ID: charge.transactionId, EVENT: 'charge_response',
      PAYMENT_STATUS: 'PENDING', AMOUNT: trx.total, RAW: JSON.stringify(charge.raw),
    });

    return {
      transaction_id: trx.id,
      no_nota: trx.no_nota,
      order_id: orderId,
      provider: 'midtrans',
      payment_status: 'PENDING',
      gross_amount: trx.total,
      qr_string: charge.qrString,
      qr_url: charge.qrUrl,
      expiry_time: charge.expiryTime,
    };
  } catch (err) {
    // Gateway gagal -> batalkan transaksi & kembalikan stok agar tidak menggantung.
    try { await penjualanService.voidPenjualan(trx.id); } catch (_) { /* abaikan */ }
    await PaymentLog.create({
      ID_PENJUALAN: trx.id, PROVIDER: 'midtrans', ORDER_ID: orderId,
      EVENT: 'charge_error', PAYMENT_STATUS: 'FAILED', AMOUNT: trx.total,
      RAW: JSON.stringify(err.raw || { message: err.message }),
    }).catch(() => {});
    throw new ApiError(err.statusCode || 502, err.message || 'Gagal membuat QRIS Midtrans.');
  }
}

// Terapkan status lokal baru ke transaksi (PAID -> LUNAS; gagal -> void/return stok).
async function applyStatus(penjualan, localStatus, midtransTrxId) {
  const updates = { PAYMENT_STATUS: localStatus };
  if (midtransTrxId) updates.MIDTRANS_TRANSACTION_ID = midtransTrxId;

  if (localStatus === 'PAID') {
    updates.STATUS_BAYAR = 'LUNAS';
    updates.PAID_AT = new Date();
    await penjualan.update(updates);
  } else if (['EXPIRED', 'CANCELLED', 'FAILED'].includes(localStatus)) {
    updates.STATUS_BAYAR = localStatus;
    await penjualan.update(updates);
    // Void: kembalikan stok bila transaksi belum dibatalkan.
    if (penjualan.STATUS === 1) {
      try { await penjualanService.voidPenjualan(penjualan.ID); } catch (_) { /* abaikan */ }
    }
  } else {
    // PENDING / UNPAID: cukup perbarui status pembayaran.
    await penjualan.update(updates);
  }
}

/**
 * POST /api/payments/midtrans/notification  (PUBLIC webhook, tanpa JWT)
 * - Simpan SETIAP payload untuk audit.
 * - Validasi signature Midtrans.
 * - Perbarui status transaksi (PAID/EXPIRED/CANCELLED/FAILED).
 * merchant_id diturunkan dari order_id (BUKAN dari body sembarang).
 */
async function handleNotification(body) {
  const orderId = body.order_id;
  const parsed = parseOrderId(orderId);

  // Log awal (selalu tersimpan untuk audit, walau order_id tidak dikenal).
  if (!parsed) {
    await PaymentWebhookLog.create({
      PROVIDER: 'midtrans', ORDER_ID: orderId || null,
      TRANSACTION_ID: body.transaction_id || null,
      TRANSACTION_STATUS: body.transaction_status || null,
      FRAUD_STATUS: body.fraud_status || null,
      SIGNATURE_VALID: false, MAPPED_STATUS: null, RAW: JSON.stringify(body),
    });
    throw new ApiError(400, 'order_id tidak valid.');
  }

  const { merchantId } = parsed;

  // Jalankan dalam scope merchant agar semua operasi model ter-filter & MERCHANT_ID terisi.
  return withMerchantScope(merchantId, async () => {
    const setting = await getSetting();
    const signatureValid = midtrans.verifySignature({
      orderId,
      statusCode: body.status_code,
      grossAmount: body.gross_amount,
      signatureKey: body.signature_key,
      setting,
    });

    const localStatus = midtrans.mapStatus(body.transaction_status, body.fraud_status);
    const penjualan = await Penjualan.findOne({ where: { MIDTRANS_ORDER_ID: orderId } });

    await PaymentWebhookLog.create({
      PROVIDER: 'midtrans', ORDER_ID: orderId,
      TRANSACTION_ID: body.transaction_id || null,
      TRANSACTION_STATUS: body.transaction_status || null,
      FRAUD_STATUS: body.fraud_status || null,
      SIGNATURE_VALID: signatureValid, MAPPED_STATUS: localStatus,
      MERCHANT_ID: merchantId, ID_PENJUALAN: penjualan ? penjualan.ID : null,
      RAW: JSON.stringify(body),
    });

    if (!signatureValid) throw new ApiError(403, 'Signature Midtrans tidak valid.');
    if (!penjualan) throw new ApiError(404, 'Transaksi tidak ditemukan.');
    if (penjualan.MERCHANT_ID !== merchantId) throw new ApiError(403, 'Merchant tidak cocok.');

    // Idempoten: abaikan bila sudah final & sama.
    if (penjualan.PAYMENT_STATUS !== localStatus) {
      await applyStatus(penjualan, localStatus, body.transaction_id);
      await PaymentLog.create({
        ID_PENJUALAN: penjualan.ID, PROVIDER: 'midtrans', ORDER_ID: orderId,
        TRANSACTION_ID: body.transaction_id || null, EVENT: 'webhook_status_update',
        PAYMENT_STATUS: localStatus, AMOUNT: Number(body.gross_amount) || null,
        RAW: JSON.stringify(body),
      });
    }
    return { order_id: orderId, payment_status: localStatus };
  });
}

/**
 * GET /api/payments/status/{transaction_id}  (authed, ter-scope merchant)
 * Polling status. Bila belum final & ada order_id, refresh langsung ke Midtrans
 * (membantu demo sandbox di localhost yang webhook-nya belum terjangkau).
 */
async function getStatus(transactionId) {
  const penjualan = await Penjualan.findByPk(transactionId);
  if (!penjualan) throw new ApiError(404, 'Transaksi tidak ditemukan.');

  let localStatus = penjualan.PAYMENT_STATUS || (penjualan.STATUS_BAYAR === 'LUNAS' ? 'PAID' : 'UNPAID');

  const nonFinal = !midtrans.isFinalStatus(localStatus);
  if (nonFinal && penjualan.PAYMENT_PROVIDER === 'midtrans' && penjualan.MIDTRANS_ORDER_ID) {
    const setting = await getSetting();
    const fresh = await midtrans.getTransactionStatus({ orderId: penjualan.MIDTRANS_ORDER_ID, setting });
    if (fresh && fresh.transactionStatus) {
      const mapped = midtrans.mapStatus(fresh.transactionStatus, fresh.fraudStatus);
      if (mapped !== localStatus) {
        await applyStatus(penjualan, mapped, fresh.transactionId);
        await PaymentLog.create({
          ID_PENJUALAN: penjualan.ID, PROVIDER: 'midtrans',
          ORDER_ID: penjualan.MIDTRANS_ORDER_ID, TRANSACTION_ID: fresh.transactionId,
          EVENT: 'poll_status_update', PAYMENT_STATUS: mapped, RAW: JSON.stringify(fresh.raw),
        }).catch(() => {});
        localStatus = mapped;
      }
    }
  }

  return {
    transaction_id: penjualan.ID,
    order_id: penjualan.MIDTRANS_ORDER_ID || null,
    provider: penjualan.PAYMENT_PROVIDER || null,
    payment_status: localStatus,
    status_bayar: penjualan.STATUS_BAYAR,
    paid_at: penjualan.PAID_AT || null,
    total: Number(penjualan.TOTAL) || 0,
  };
}

module.exports = { createQris, handleNotification, getStatus, parseOrderId, buildOrderId };
