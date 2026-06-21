const svc = require('../services/subscriptionService');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/response');
const { withImageUrl } = require('../utils/fileUrl');

const withQris = (row, req) => withImageUrl(row, 'QRIS_IMAGE', req);
const withBukti = (row, req) => withImageUrl(row, 'BUKTI', req);

module.exports = {
  // ===== Setting (global) =====
  getSetting: catchAsync(async (req, res) =>
    success(res, { data: withQris(await svc.getSetting(), req) })),

  updateSetting: catchAsync(async (req, res) => {
    const imagePath = req.file ? `uploads/subscription/${req.file.filename}` : undefined;
    return success(res, { data: withQris(await svc.updateSetting(req.body, imagePath), req), message: 'Pengaturan langganan diperbarui' });
  }),

  // ===== Merchant =====
  billing: catchAsync(async (req, res) => {
    const data = await svc.billing();
    data.payments = (data.payments || []).map((p) => withBukti(p, req));
    if (data.latest) data.latest = withBukti(data.latest, req);
    return success(res, { data });
  }),

  createPayment: catchAsync(async (req, res) =>
    created(res, await svc.createPayment(req.body), 'Pembayaran langganan dibuat')),

  submitPayment: catchAsync(async (req, res) => {
    const buktiPath = req.file ? `uploads/proof/${req.file.filename}` : undefined;
    return success(res, { data: withBukti(await svc.submitPayment(req.params.id, buktiPath), req), message: 'Bukti pembayaran terkirim, menunggu verifikasi' });
  }),

  // ===== Super admin =====
  listPayments: catchAsync(async (req, res) =>
    success(res, { data: (await svc.listAllPayments(req.query)).map((p) => withBukti(p, req)) })),

  getPayment: catchAsync(async (req, res) =>
    success(res, { data: withBukti(await svc.getPaymentAdmin(req.params.id), req) })),

  verify: catchAsync(async (req, res) =>
    success(res, { data: await svc.verifyPayment(req.params.id, req.user.id), message: 'Pembayaran diverifikasi, merchant menjadi PRO' })),

  reject: catchAsync(async (req, res) =>
    success(res, { data: await svc.rejectPayment(req.params.id, req.body.reason), message: 'Pembayaran ditolak' })),
};
