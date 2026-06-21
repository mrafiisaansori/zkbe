const svc = require('../services/returService');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/response');

module.exports = {
  list: catchAsync(async (req, res) => success(res, { data: await svc.list() })),
  getById: catchAsync(async (req, res) => success(res, { data: await svc.getById(req.params.id) })),
  create: catchAsync(async (req, res) => created(res, await svc.create(req.body), 'Retur dibuat')),
  update: catchAsync(async (req, res) => success(res, { data: await svc.update(req.params.id, req.body), message: 'Retur diperbarui' })),
  remove: catchAsync(async (req, res) => { await svc.remove(req.params.id); return success(res, { message: 'Retur dihapus' }); }),
  addDetail: catchAsync(async (req, res) => created(res, await svc.addDetail(req.params.id, req.body), 'Detail retur ditambahkan')),
  removeDetail: catchAsync(async (req, res) => { await svc.removeDetail(req.params.id, req.params.idDetail); return success(res, { message: 'Detail retur dibatalkan' }); }),
};
