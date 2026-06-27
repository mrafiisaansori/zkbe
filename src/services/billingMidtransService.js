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

function chargeQris(params) {
  return midtrans.chargeQris({ ...params, setting: gatewaySetting() });
}

function getStatus(orderId) {
  return midtrans.getTransactionStatus({ orderId, setting: gatewaySetting() });
}

function verifySignature(payload) {
  return midtrans.verifySignature({ ...payload, setting: gatewaySetting() });
}

module.exports = {
  gatewaySetting,
  buildOrderId,
  parseOrderId,
  chargeQris,
  getStatus,
  verifySignature,
  mapStatus: midtrans.mapStatus,
  isFinalStatus: midtrans.isFinalStatus,
};
