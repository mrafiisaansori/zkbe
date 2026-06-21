const svc = require('../services/transaksiService');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/response');

module.exports = {
  list: catchAsync(async (req, res) => success(res, { data: await svc.list(req.query) })),
  create: catchAsync(async (req, res) => created(res, await svc.create(req.body), 'Transaksi keuangan dicatat')),
  remove: catchAsync(async (req, res) => { await svc.remove(req.params.id); return success(res, { message: 'Transaksi keuangan dihapus' }); }),
};
