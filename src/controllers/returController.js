const svc = require('../services/returService');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/response');

module.exports = {
  list: catchAsync(async (req, res) => {
    const result = await svc.list(req.query);
    if (result && result.rows) return success(res, { data: result.rows, meta: result.meta });
    return success(res, { data: result });
  }),
  getById: catchAsync(async (req, res) => success(res, { data: await svc.getById(req.params.id) })),
  // id_user diambil dari token (req.user.id), TIDAK dari frontend.
  create: catchAsync(async (req, res) => created(res, await svc.create(req.body, req.user.id), 'Retur (draft) dibuat')),
  update: catchAsync(async (req, res) => success(res, { data: await svc.update(req.params.id, req.body), message: 'Retur diperbarui' })),
  remove: catchAsync(async (req, res) => { await svc.remove(req.params.id); return success(res, { message: 'Retur dihapus' }); }),
  selesaikan: catchAsync(async (req, res) => success(res, { data: await svc.selesaikan(req.params.id, req.user.id), message: 'Retur selesai, stok dikurangi' })),
  cancel: catchAsync(async (req, res) => success(res, { data: await svc.cancel(req.params.id, req.user.id), message: 'Retur dibatalkan' })),
};
