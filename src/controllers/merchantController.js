const svc = require('../services/merchantService');
const catchAsync = require('../utils/catchAsync');
const { success } = require('../utils/response');

module.exports = {
  // Super admin
  list: catchAsync(async (req, res) => success(res, { data: await svc.listAll(req.query) })),
  stats: catchAsync(async (req, res) => success(res, { data: await svc.stats() })),
  getById: catchAsync(async (req, res) => success(res, { data: await svc.getById(req.params.id) })),
  updateStatus: catchAsync(async (req, res) =>
    success(res, { data: await svc.updateStatus(req.params.id, req.body.status), message: 'Status merchant diperbarui' })),

  // Admin merchant - toko sendiri (merchant_id dari token)
  getOwn: catchAsync(async (req, res) => success(res, { data: await svc.getOwn(req.user.merchant_id) })),
  updateOwn: catchAsync(async (req, res) =>
    success(res, { data: await svc.updateOwn(req.user.merchant_id, req.body), message: 'Data toko diperbarui' })),
};
