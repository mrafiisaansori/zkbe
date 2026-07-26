const svc = require('../services/memberService');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/response');

module.exports = {
  list: catchAsync(async (req, res) => {
    const result = await svc.list(req.query);
    if (result && result.rows) return success(res, { data: result.rows, meta: result.meta });
    return success(res, { data: result });
  }),
  getById: catchAsync(async (req, res) => success(res, { data: await svc.getById(req.params.id) })),
  getDetail: catchAsync(async (req, res) => success(res, { data: await svc.getDetail(req.params.id) })),
  create: catchAsync(async (req, res) => created(res, await svc.create(req.body), 'Member ditambahkan')),
  update: catchAsync(async (req, res) => success(res, { data: await svc.update(req.params.id, req.body), message: 'Member diperbarui' })),
  remove: catchAsync(async (req, res) => { await svc.remove(req.params.id); return success(res, { message: 'Member dihapus' }); }),
};
