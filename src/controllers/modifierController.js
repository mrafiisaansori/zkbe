const svc = require('../services/modifierService');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/response');

module.exports = {
  listGroups: catchAsync(async (req, res) => success(res, { data: await svc.listGroups() })),
  createGroup: catchAsync(async (req, res) => created(res, await svc.createGroup(req.body), 'Grup modifier dibuat')),
  updateGroup: catchAsync(async (req, res) => success(res, { data: await svc.updateGroup(req.params.id, req.body), message: 'Grup diperbarui' })),
  removeGroup: catchAsync(async (req, res) => { await svc.removeGroup(req.params.id); return success(res, { message: 'Grup dihapus' }); }),

  addOption: catchAsync(async (req, res) => created(res, await svc.addOption(req.params.id, req.body), 'Opsi ditambahkan')),
  updateOption: catchAsync(async (req, res) => success(res, { data: await svc.updateOption(req.params.id, req.body), message: 'Opsi diperbarui' })),
  removeOption: catchAsync(async (req, res) => { await svc.removeOption(req.params.id); return success(res, { message: 'Opsi dihapus' }); }),

  getForProduct: catchAsync(async (req, res) => success(res, { data: await svc.getForProduct(req.params.id) })),
  setProductGroups: catchAsync(async (req, res) => success(res, { data: await svc.setProductGroups(req.params.id, req.body.group_ids), message: 'Varian produk disimpan' })),
};
