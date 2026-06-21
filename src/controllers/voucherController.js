const svc = require('../services/voucherService');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/response');

module.exports = {
  list: catchAsync(async (req, res) => success(res, { data: await svc.list() })),
  create: catchAsync(async (req, res) => created(res, await svc.create(req.body), 'Voucher dibuat')),
  update: catchAsync(async (req, res) => success(res, { data: await svc.update(req.params.id, req.body), message: 'Voucher diperbarui' })),
  remove: catchAsync(async (req, res) => { await svc.remove(req.params.id); return success(res, { message: 'Voucher dihapus' }); }),
  // Validasi & pratinjau diskon voucher untuk subtotal tertentu (dipakai kasir).
  validate: catchAsync(async (req, res) => {
    const { kode, subtotal } = req.query;
    const data = await svc.validateForSubtotal(kode, Number(subtotal) || 0);
    return success(res, { data: { kode: data.voucher.KODE, tipe: data.voucher.TIPE, nilai: data.voucher.NILAI, diskon: data.diskon } });
  }),
};
