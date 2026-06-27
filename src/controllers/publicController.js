const svc = require('../services/publicService');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/response');
const { SubscriptionSetting } = require('../models');

module.exports = {
  // Status maintenance (publik) - frontend memakai ini untuk menampilkan halaman maintenance.
  maintenance: catchAsync(async (req, res) => {
    const row = await SubscriptionSetting.findByPk(1);
    return success(res, {
      data: {
        active: row ? Number(row.MAINTENANCE_MODE) === 1 : false,
        message: row ? (row.MAINTENANCE_MESSAGE || '') : '',
      },
    });
  }),
  // QR Menu (self order) - tanpa login.
  getMenu: catchAsync(async (req, res) => success(res, { data: await svc.getMenu(req.params.token, req) })),
  createOrder: catchAsync(async (req, res) => created(res, await svc.createOrder(req.params.token, req.body, req), 'Pesanan terkirim')),
  // Katalog publik - tanpa login.
  getCatalog: catchAsync(async (req, res) => success(res, { data: await svc.getCatalog(req.params.slug, req) })),
};
