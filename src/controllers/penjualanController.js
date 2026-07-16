const svc = require('../services/penjualanService');
const waStrukService = require('../services/waStrukService');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/response');

module.exports = {
  list: catchAsync(async (req, res) => {
    const result = await svc.list(req.query);
    if (result && result.rows) return success(res, { data: result.rows, meta: result.meta });
    return success(res, { data: result });
  }),
  getById: catchAsync(async (req, res) => success(res, { data: await svc.getById(req.params.id) })),
  checkout: catchAsync(async (req, res) => created(res, await svc.checkout(req.body), 'Transaksi penjualan berhasil')),
  void: catchAsync(async (req, res) => success(res, { data: await svc.voidPenjualan(req.params.id), message: 'Transaksi dibatalkan' })),
  kirimWA: catchAsync(async (req, res) => success(res, {
    data: await waStrukService.kirimStruk(req.params.id, req.body.nomor),
    message: 'Struk dikirim ke WhatsApp',
  })),
};
