const svc = require('../services/mejaService');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/response');

module.exports = {
  list: catchAsync(async (req, res) => success(res, { data: await svc.list() })),
  create: catchAsync(async (req, res) => created(res, await svc.create(req.body), 'Meja dibuat')),
  update: catchAsync(async (req, res) => success(res, { data: await svc.update(req.params.id, req.body), message: 'Meja diperbarui' })),
  remove: catchAsync(async (req, res) => { await svc.remove(req.params.id); return success(res, { message: 'Meja dihapus' }); }),
};
