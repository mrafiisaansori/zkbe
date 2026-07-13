const env = require('../config/env');
const midtrans = require('./midtransService');
const ApiError = require('../utils/ApiError');

function gatewaySetting() {
  const cfg = env.billingMidtrans;
  if (!cfg.merchantId || !cfg.clientKey || !cfg.serverKey) {
    throw new ApiError(503, 'Midtrans billing belum dikonfigurasi lengkap di server.');
  }
  return {
    MIDTRANS_MERCHANT_ID: cfg.merchantId,
    MIDTRANS_CLIENT_KEY: cfg.clientKey,
    MIDTRANS_SERVER_KEY: cfg.serverKey,
    IS_PRODUCTION: cfg.isProduction,
  };
}

function buildOrderId(merchantId, paymentId) {
  return `ZKB-${Number(merchantId)}-${Number(paymentId)}-${Date.now()}`;
}

function parseOrderId(orderId) {
  const match = /^ZKB-(\d+)-(\d+)-(\d+)$/.exec(String(orderId || ''));
  if (!match) return null;
  return { merchantId: Number(match[1]), paymentId: Number(match[2]) };
}

function createSnapTransaction(params) {
  return midtrans.createSnapTransaction({ ...params, setting: gatewaySetting() });
}

// Khusus alat test superadmin (lihat midtransTestService.js) - bukan alur pembayaran asli.
function chargeGopayQris(params) {
  return midtrans.chargeGopayQris({ ...params, setting: gatewaySetting() });
}

function getStatus(orderId) {
  return midtrans.getTransactionStatus({ orderId, setting: gatewaySetting() });
}

function cancelTransaction(orderId) {
  return midtrans.cancelTransaction({ orderId, setting: gatewaySetting() });
}

function verifySignature(payload) {
  return midtrans.verifySignature({ ...payload, setting: gatewaySetting() });
}

module.exports = {
  gatewaySetting,
  buildOrderId,
  parseOrderId,
  createSnapTransaction,
  chargeGopayQris,
  getStatus,
  cancelTransaction,
  verifySignature,
  mapStatus: midtrans.mapStatus,
  isFinalStatus: midtrans.isFinalStatus,
};
