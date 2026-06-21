const svc = require('../services/publicService');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/response');

module.exports = {
  // QR Menu (self order) - tanpa login.
  getMenu: catchAsync(async (req, res) => success(res, { data: await svc.getMenu(req.params.token, req) })),
  createOrder: catchAsync(async (req, res) => created(res, await svc.createOrder(req.params.token, req.body, req), 'Pesanan terkirim')),
  // Katalog publik - tanpa login.
  getCatalog: catchAsync(async (req, res) => success(res, { data: await svc.getCatalog(req.params.slug, req) })),
};
