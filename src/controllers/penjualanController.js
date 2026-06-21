const svc = require('../services/penjualanService');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/response');

module.exports = {
  list: catchAsync(async (req, res) => success(res, { data: await svc.list(req.query) })),
  getById: catchAsync(async (req, res) => success(res, { data: await svc.getById(req.params.id) })),
  checkout: catchAsync(async (req, res) => created(res, await svc.checkout(req.body), 'Transaksi penjualan berhasil')),
  void: catchAsync(async (req, res) => success(res, { data: await svc.voidPenjualan(req.params.id), message: 'Transaksi dibatalkan' })),
};
