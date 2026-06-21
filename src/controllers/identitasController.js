const svc = require('../services/identitasService');
const catchAsync = require('../utils/catchAsync');
const { success } = require('../utils/response');
const { withImageUrl } = require('../utils/fileUrl');

// Tambahkan LOGO_URL & BANNER_URL absolut.
function withUrls(row, req) {
  if (!row) return row;
  return withImageUrl(withImageUrl(row, 'LOGO', req), 'BANNER', req);
}

module.exports = {
  get: catchAsync(async (req, res) => success(res, { data: withUrls(await svc.get(), req) })),
  update: catchAsync(async (req, res) => success(res, { data: withUrls(await svc.update(req.body), req), message: 'Identitas diperbarui' })),
  // Upload banner katalog (multipart).
  uploadBanner: catchAsync(async (req, res) => {
    const banner = req.file ? `uploads/banner/${req.file.filename}` : undefined;
    return success(res, { data: withUrls(await svc.update({ banner }), req), message: 'Banner diperbarui' });
  }),
  // Upload logo toko (multipart).
  uploadLogo: catchAsync(async (req, res) => {
    const logo = req.file ? `uploads/logo/${req.file.filename}` : undefined;
    return success(res, { data: withUrls(await svc.update({ logo }), req), message: 'Logo diperbarui' });
  }),
};
