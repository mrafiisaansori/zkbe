const svc = require('../services/qrisService');
const catchAsync = require('../utils/catchAsync');
const { success } = require('../utils/response');
const { withQrisImageUrl } = require('../utils/fileUrl');

// Gabungkan field teks + file gambar (jika ada) menjadi payload service.
// IMAGE disimpan sebagai path relatif: uploads/qris/<filename>.
function buildPayload(req) {
  const data = { ...req.body };
  if (req.file) data.image = `uploads/qris/${req.file.filename}`;
  return data;
}

module.exports = {
  get: catchAsync(async (req, res) =>
    success(res, { data: withQrisImageUrl(await svc.get(), req) })),

  update: catchAsync(async (req, res) =>
    success(res, {
      data: withQrisImageUrl(await svc.update(buildPayload(req)), req),
      message: 'Pengaturan QRIS diperbarui',
    })),
};
