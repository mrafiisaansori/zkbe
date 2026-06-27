const svc = require('../services/kasShiftService');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/response');

module.exports = {
  // Sesi aktif milik kasir yang login.
  active: catchAsync(async (req, res) =>
    success(res, { data: await svc.getActiveView(req.user.id) })),

  list: catchAsync(async (req, res) =>
    success(res, { data: await svc.list(req.query) })),

  getById: catchAsync(async (req, res) =>
    success(res, { data: await svc.getById(req.params.id) })),

  // id_user diambil dari token (req.user) — tidak percaya frontend.
  open: catchAsync(async (req, res) =>
    created(res, await svc.open({ ...req.body, id_user: req.user.id }), 'Sesi kas dibuka')),

  mutasi: catchAsync(async (req, res) =>
    created(res, await svc.addMutasi(req.params.id, { ...req.body, id_user: req.user.id }), 'Mutasi kas dicatat')),

  closePreview: catchAsync(async (req, res) =>
    success(res, { data: await svc.closePreview(req.params.id) })),

  close: catchAsync(async (req, res) =>
    success(res, { data: await svc.close(req.params.id, req.body), message: 'Sesi kas ditutup' })),

  reportDaily: catchAsync(async (req, res) =>
    success(res, { data: await svc.reportDaily(req.query.tanggal) })),
};
