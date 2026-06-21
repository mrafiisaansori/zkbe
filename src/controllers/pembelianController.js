const svc = require('../services/pembelianService');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/response');

module.exports = {
  list: catchAsync(async (req, res) => success(res, { data: await svc.list() })),
  getById: catchAsync(async (req, res) => success(res, { data: await svc.getById(req.params.id) })),
  create: catchAsync(async (req, res) => created(res, await svc.create(req.body), 'Pembelian dibuat')),
  update: catchAsync(async (req, res) => success(res, { data: await svc.update(req.params.id, req.body), message: 'Pembelian diperbarui' })),
  remove: catchAsync(async (req, res) => { await svc.remove(req.params.id); return success(res, { message: 'Pembelian dihapus' }); }),
  addDetail: catchAsync(async (req, res) => created(res, await svc.addDetail(req.params.id, req.body), 'Detail pembelian ditambahkan')),
  removeDetail: catchAsync(async (req, res) => { await svc.removeDetail(req.params.id, req.params.idDetail); return success(res, { message: 'Detail pembelian dihapus' }); }),
  selesaikan: catchAsync(async (req, res) => success(res, { data: await svc.selesaikan(req.params.id), message: 'Pembelian diselesaikan, stok diperbarui' })),
};
