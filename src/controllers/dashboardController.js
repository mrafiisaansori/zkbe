const svc = require('../services/dashboardService');
const catchAsync = require('../utils/catchAsync');
const { success } = require('../utils/response');

module.exports = {
  summary: catchAsync(async (req, res) => success(res, { data: await svc.summary() })),
  chart: catchAsync(async (req, res) => success(res, { data: await svc.chartTahunan(req.query.tahun) })),
};
