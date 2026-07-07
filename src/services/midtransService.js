const crypto = require('crypto');
const env = require('../config/env');

// =====================================================================
// Midtrans Core API client (QRIS dinamis).
// SERVER_KEY hanya dipakai di sini (backend). Tidak pernah ke frontend.
// Sandbox: https://api.sandbox.midtrans.com ; Production: https://api.midtrans.com
// Kredensial diambil dari ENV global, dengan opsi override per merchant
// (m_payment_gateway_setting) bila merchant punya akun Midtrans sendiri.
// =====================================================================

const SANDBOX_BASE = 'https://api.sandbox.midtrans.com';
const PRODUCTION_BASE = 'https://api.midtrans.com';

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

function authHeader(serverKey) {
  // Basic auth: base64(serverKey + ':') sesuai dokumentasi Midtrans.
  return `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;
}

function notificationUrl() {
  if (!env.appUrl) return '';
  return `${env.appUrl.replace(/\/$/, '')}/api/midtrans/notification`;
}

/**
 * Buat charge QRIS dinamis di Midtrans.
 * @returns { orderId, transactionId, status, qrString, qrUrl, expiryTime, raw }
 */
async function chargeQris({ orderId, grossAmount, customerName, setting }) {
  const { serverKey, isProduction } = resolveCredentials(setting);
  if (!serverKey) {
    const err = new Error('Kredensial Midtrans (SERVER_KEY) belum dikonfigurasi di server.');
    err.statusCode = 503;
    throw err;
  }

  const body = {
    payment_type: 'qris',
    transaction_details: {
      order_id: orderId,
      gross_amount: Math.round(Number(grossAmount)), // QRIS hanya menerima bilangan bulat
    },
    qris: { acquirer: 'gopay' },
    customer_details: customerName ? { first_name: String(customerName).slice(0, 50) } : undefined,
  };
  const overrideNotification = notificationUrl();

  const res = await fetch(`${baseUrl(isProduction)}/v2/charge`, {
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
  // status_code '201' = transaksi berhasil dibuat (pending pembayaran).
  if (!res.ok || !['200', '201'].includes(String(raw.status_code))) {
    const gatewayMessage = raw.status_message || raw.validation_messages || raw.error_messages;
    const err = new Error(Array.isArray(gatewayMessage)
      ? gatewayMessage.join(', ')
      : (gatewayMessage || 'Gagal membuat transaksi QRIS Midtrans.'));
    err.statusCode = 502;
    err.raw = raw;
    throw err;
  }

  // Ambil URL gambar QR dari array actions (rel: generate-qr-code).
  const actions = Array.isArray(raw.actions) ? raw.actions : [];
  const qrAction = actions.find((a) => a.name === 'generate-qr-code') || actions[0];

  return {
    orderId: raw.order_id || orderId,
    transactionId: raw.transaction_id || null,
    status: raw.transaction_status || 'pending',
    qrString: raw.qr_string || null,
    qrUrl: qrAction ? qrAction.url : null,
    expiryTime: raw.expiry_time || null,
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
  chargeQris, getTransactionStatus, verifySignature, mapStatus, isFinalStatus, resolveCredentials,
};
