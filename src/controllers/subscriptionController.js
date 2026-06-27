const svc = require('../services/subscriptionService');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/response');

function safePayment(row) {
  if (!row) return row;
  const plain = typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
  delete plain.RAW_RESPONSE;
  delete plain.LAST_NOTIFICATION;
  delete plain.QR_STRING;
  return plain;
}

function safeSetting(row) {
  const plain = typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
  delete plain.QRIS_IMAGE;
  delete plain.QRIS_LABEL;
  return plain;
}

module.exports = {
  // ===== Setting (global) =====
  getSetting: catchAsync(async (req, res) =>
    success(res, { data: safeSetting(await svc.getSetting()) })),

  updateSetting: catchAsync(async (req, res) =>
    success(res, { data: safeSetting(await svc.updateSetting(req.body)), message: 'Harga paket diperbarui' })),

  // ===== Merchant =====
  billing: catchAsync(async (req, res) => {
    const data = await svc.billing();
    data.payments = (data.payments || []).map(safePayment);
    data.latest = safePayment(data.latest);
    return success(res, { data });
  }),

  createPayment: catchAsync(async (req, res) =>
    created(res, safePayment(await svc.createPayment(req.body)), 'QRIS upgrade plan berhasil dibuat')),

  paymentStatus: catchAsync(async (req, res) =>
    success(res, { data: safePayment(await svc.getPaymentStatus(req.params.id)) })),

  notification: catchAsync(async (req, res) => {
    const result = await svc.handleNotification(req.body);
    return res.status(200).json({ success: true, ...result });
  }),

  // ===== Super admin =====
  listPayments: catchAsync(async (req, res) =>
    success(res, { data: (await svc.listAllPayments(req.query)).map(safePayment) })),

  getPayment: catchAsync(async (req, res) =>
    success(res, { data: safePayment(await svc.getPaymentAdmin(req.params.id)) })),
};
