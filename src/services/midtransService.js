const crypto = require('crypto');
const env = require('../config/env');

// =====================================================================
// Midtrans client - transaksi dibuat via Snap (bukan Core API /v2/charge),
// karena akses Core API per-channel (mis. payment_type=qris) butuh aktivasi
// terpisah oleh Midtrans meski channel sudah aktif di dashboard. Snap
// otomatis menampilkan semua channel yang aktif di dashboard merchant.
// SERVER_KEY hanya dipakai di sini (backend). Tidak pernah ke frontend.
// Status/notification tetap pakai Core API (sama untuk transaksi Snap).
// Kredensial diambil dari ENV global, dengan opsi override per merchant
// (m_payment_gateway_setting) bila merchant punya akun Midtrans sendiri.
// =====================================================================

const SANDBOX_BASE = 'https://api.sandbox.midtrans.com';
const PRODUCTION_BASE = 'https://api.midtrans.com';
const SNAP_SANDBOX_BASE = 'https://app.sandbox.midtrans.com';
const SNAP_PRODUCTION_BASE = 'https://app.midtrans.com';

// Resolusi kredensial: pakai setting merchant bila lengkap, jika tidak pakai ENV.
function resolveCredentials(setting) {
  const serverKey = (setting && setting.MIDTRANS_SERVER_KEY) || env.midtrans.serverKey;
  const clientKey = (setting && setting.MIDTRANS_CLIENT_KEY) || env.midtrans.clientKey;
  const isProduction = setting && setting.MIDTRANS_SERVER_KEY
    ? !!setting.IS_PRODUCTION
    : env.midtrans.isProduction;
  return { serverKey, clientKey, isProduction };
}

function baseUrl(isProduction) {
  return isProduction ? PRODUCTION_BASE : SANDBOX_BASE;
}

function snapBaseUrl(isProduction) {
  return isProduction ? SNAP_PRODUCTION_BASE : SNAP_SANDBOX_BASE;
}

function authHeader(serverKey) {
  // Basic auth: base64(serverKey + ':') sesuai dokumentasi Midtrans.
  return `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;
}

function notificationUrl() {
  if (!env.appUrl) return '';
  return `${env.appUrl.replace(/\/$/, '')}/api/midtrans/notification`;
}

/**
 * Buat transaksi Snap (checkout page/popup Midtrans). Snap menampilkan semua
 * channel yang sudah diaktifkan merchant di dashboard (GoPay, QRIS, VA bank,
 * kartu, dll) tanpa perlu akses Core API terpisah per channel.
 * @returns { orderId, token, redirectUrl, clientKey, isProduction, raw }
 */
async function createSnapTransaction({
  orderId, grossAmount, customerName, itemDetails, expiryMinutes, setting,
}) {
  const { serverKey, clientKey, isProduction } = resolveCredentials(setting);
  if (!serverKey) {
    const err = new Error('Kredensial Midtrans (SERVER_KEY) belum dikonfigurasi di server.');
    err.statusCode = 503;
    throw err;
  }
  const overrideNotification = notificationUrl();
  if (isProduction && !overrideNotification) {
    const err = new Error('APP_URL backend publik wajib diisi untuk X-Override-Notification Midtrans production.');
    err.statusCode = 503;
    throw err;
  }

  const body = {
    transaction_details: {
      order_id: orderId,
      gross_amount: Math.round(Number(grossAmount)),
    },
    customer_details: customerName ? { first_name: String(customerName).slice(0, 50) } : undefined,
    item_details: Array.isArray(itemDetails) && itemDetails.length ? itemDetails : undefined,
    expiry: expiryMinutes ? { unit: 'minutes', duration: Math.max(1, Math.round(expiryMinutes)) } : undefined,
  };

  const res = await fetch(`${snapBaseUrl(isProduction)}/snap/v1/transactions`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: authHeader(serverKey),
      ...(overrideNotification ? { 'X-Override-Notification': overrideNotification } : {}),
    },
    body: JSON.stringify(body),
  });

  const raw = await res.json().catch(() => ({}));
  if (!res.ok || !raw.token) {
    const gatewayMessage = raw.error_messages || raw.status_message;
    const message = Array.isArray(gatewayMessage)
      ? gatewayMessage.join(', ')
      : (gatewayMessage || 'Gagal membuat transaksi Snap Midtrans.');
    const err = new Error(message);
    err.statusCode = 502;
    err.raw = {
      midtrans: raw,
      request: {
        url: `${snapBaseUrl(isProduction)}/snap/v1/transactions`,
        body,
        xOverrideNotification: overrideNotification || null,
      },
    };
    throw err;
  }

  return {
    orderId,
    token: raw.token,
    redirectUrl: raw.redirect_url || null,
    clientKey,
    isProduction,
    raw,
  };
}

/**
 * Cek status transaksi langsung ke Midtrans (dipakai saat polling agar tetap
 * jalan walau webhook belum sampai — berguna untuk demo sandbox di localhost).
 * @returns { transactionStatus, fraudStatus, transactionId, raw } | null
 */
async function getTransactionStatus({ orderId, setting }) {
  const { serverKey, isProduction } = resolveCredentials(setting);
  if (!serverKey) return null;
  const res = await fetch(`${baseUrl(isProduction)}/v2/${encodeURIComponent(orderId)}/status`, {
    method: 'GET',
    headers: { Accept: 'application/json', Authorization: authHeader(serverKey) },
  });
  const raw = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  return {
    transactionStatus: raw.transaction_status || null,
    fraudStatus: raw.fraud_status || null,
    transactionId: raw.transaction_id || null,
    raw,
  };
}

/**
 * Verifikasi signature webhook Midtrans:
 * signature_key = sha512(order_id + status_code + gross_amount + server_key).
 */
function verifySignature({ orderId, statusCode, grossAmount, signatureKey, setting }) {
  const { serverKey } = resolveCredentials(setting);
  if (!serverKey || !signatureKey) return false;
  const expected = crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');
  // Bandingkan secara konstan-waktu untuk menghindari timing attack.
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signatureKey));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Petakan status Midtrans -> status pembayaran lokal.
 * UNPAID | PENDING | PAID | EXPIRED | CANCELLED | FAILED.
 */
function mapStatus(transactionStatus, fraudStatus) {
  switch (transactionStatus) {
    case 'capture':
      return fraudStatus === 'accept' || !fraudStatus ? 'PAID' : 'PENDING';
    case 'settlement':
      return 'PAID';
    case 'pending':
      return 'PENDING';
    case 'deny':
      return 'FAILED';
    case 'cancel':
      return 'CANCELLED';
    case 'expire':
      return 'EXPIRED';
    case 'failure':
      return 'FAILED';
    default:
      return 'PENDING';
  }
}

// Status final (tidak akan berubah lagi) -> berhenti polling.
function isFinalStatus(localStatus) {
  return ['PAID', 'EXPIRED', 'CANCELLED', 'FAILED'].includes(localStatus);
}

module.exports = {
  createSnapTransaction, getTransactionStatus, verifySignature, mapStatus, isFinalStatus, resolveCredentials,
};
