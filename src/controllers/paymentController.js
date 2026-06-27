const svc = require('../services/paymentService');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/response');

module.exports = {
  // POST /api/payments/midtrans/qris/create (authed, BUSINESS only)
  createQris: catchAsync(async (req, res) =>
    created(res, await svc.createQris(req.body), 'QRIS Midtrans dibuat')),

  // POST /api/payments/midtrans/notification (PUBLIC webhook dari Midtrans)
  notification: catchAsync(async (req, res) => {
    const result = await svc.handleNotification(req.body);
    // Midtrans hanya butuh HTTP 200 untuk menganggap notifikasi diterima.
    return res.status(200).json({ success: true, ...result });
  }),

  // GET /api/payments/status/:transaction_id (authed, ter-scope merchant)
  status: catchAsync(async (req, res) =>
    success(res, { data: await svc.getStatus(req.params.transaction_id) })),
};
