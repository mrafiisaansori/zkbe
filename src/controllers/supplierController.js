const svc = require('../services/supplierService');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/response');

module.exports = {
  list: catchAsync(async (req, res) => success(res, { data: await svc.list(req.query) })),
  getById: catchAsync(async (req, res) => success(res, { data: await svc.getById(req.params.id) })),
  create: catchAsync(async (req, res) => created(res, await svc.create(req.body), 'Supplier ditambahkan')),
  update: catchAsync(async (req, res) => success(res, { data: await svc.update(req.params.id, req.body), message: 'Data diperbarui' })),
  remove: catchAsync(async (req, res) => { await svc.remove(req.params.id); return success(res, { message: 'Data dihapus' }); }),
};
