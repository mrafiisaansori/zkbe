const svc = require('../services/openBillService');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/response');

module.exports = {
  list: catchAsync(async (req, res) => {
    const result = await svc.list(req.query);
    if (result && result.rows) return success(res, { data: result.rows, meta: result.meta });
    return success(res, { data: result });
  }),

  getById: catchAsync(async (req, res) =>
    success(res, { data: await svc.getById(req.params.id) })),

  // id_user diambil dari token (req.user) — TIDAK percaya frontend.
  create: catchAsync(async (req, res) =>
    created(res, await svc.create({ ...req.body, id_user: req.user.id }), 'Open bill tersimpan')),

  update: catchAsync(async (req, res) =>
    success(res, { data: await svc.update(req.params.id, req.body), message: 'Open bill diperbarui' })),

  pay: catchAsync(async (req, res) =>
    success(res, { data: await svc.pay(req.params.id, { ...req.body, id_user: req.user.id }), message: 'Open bill dibayar' })),

  payPartial: catchAsync(async (req, res) =>
    success(res, { data: await svc.payPartial(req.params.id, { ...req.body, id_user: req.user.id }), message: 'Split bill dibayar' })),

  createPartialQris: catchAsync(async (req, res) =>
    success(res, { data: await svc.createPartialQris(req.params.id, { ...req.body, id_user: req.user.id }), message: 'QRIS split bill dibuat' })),

  cancel: catchAsync(async (req, res) =>
    success(res, { data: await svc.cancel(req.params.id), message: 'Open bill dibatalkan' })),
};
