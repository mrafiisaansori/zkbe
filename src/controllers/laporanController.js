const svc = require('../services/laporanService');
const catchAsync = require('../utils/catchAsync');
const { success } = require('../utils/response');

module.exports = {
  penjualan: catchAsync(async (req, res) => success(res, { data: await svc.penjualan(req.query) })),
  pendapatan: catchAsync(async (req, res) => success(res, { data: await svc.pendapatan(req.query) })),
  stok: catchAsync(async (req, res) => success(res, { data: await svc.stok() })),
  penyusutan: catchAsync(async (req, res) => success(res, { data: await svc.penyusutan() })),
};
