const svc = require('../services/wilayahService');
const catchAsync = require('../utils/catchAsync');
const { success } = require('../utils/response');
const ApiError = require('../utils/ApiError');

module.exports = {
  provinsi: catchAsync(async (req, res) => success(res, { data: await svc.listProvinsi() })),
  kota: catchAsync(async (req, res) => {
    const provinsiId = req.query.provinsi_id;
    if (!provinsiId) throw new ApiError(400, 'Parameter provinsi_id diperlukan');
    return success(res, { data: await svc.listKota(provinsiId) });
  }),
};
