const svc = require('../services/penyusutanService');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/response');

module.exports = {
  listByProduk: catchAsync(async (req, res) => success(res, { data: await svc.listByProduk(req.params.id) })),
  create: catchAsync(async (req, res) => created(res, await svc.create(req.params.id, req.body), 'Penyusutan dicatat, harga jual diperbarui')),
  remove: catchAsync(async (req, res) => { await svc.remove(req.params.id); return success(res, { message: 'Penyusutan dihapus, harga jual dikembalikan' }); }),
};
