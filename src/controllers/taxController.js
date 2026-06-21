const svc = require('../services/taxService');
const catchAsync = require('../utils/catchAsync');
const { success } = require('../utils/response');

module.exports = {
  get: catchAsync(async (req, res) => success(res, { data: await svc.get() })),
  update: catchAsync(async (req, res) =>
    success(res, { data: await svc.update(req.body), message: 'Pengaturan pajak diperbarui' })),
};
