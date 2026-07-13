const svc = require('../services/midtransTestService');
const catchAsync = require('../utils/catchAsync');
const { success } = require('../utils/response');

module.exports = {
  chargeGopayQrisTest: catchAsync(async (req, res) =>
    success(res, { data: await svc.chargeGopayQrisTest(), message: 'QR GoPay test Rp1 dibuat' })),
};
