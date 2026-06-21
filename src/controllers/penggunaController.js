const svc = require('../services/penggunaService');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/response');

module.exports = {
  list: catchAsync(async (req, res) => success(res, { data: await svc.list() })),
  getById: catchAsync(async (req, res) => success(res, { data: await svc.getById(req.params.id) })),
  create: catchAsync(async (req, res) => created(res, await svc.create(req.body), 'Pengguna ditambahkan')),
  update: catchAsync(async (req, res) => success(res, { data: await svc.update(req.params.id, req.body), message: 'Pengguna diperbarui' })),
  remove: catchAsync(async (req, res) => { await svc.remove(req.params.id); return success(res, { message: 'Pengguna dihapus' }); }),
  resetPassword: catchAsync(async (req, res) => {
    const data = await svc.resetPassword(req.params.id);
    // Password baru hanya dikembalikan SEKALI ini agar admin bisa menyalinnya.
    return success(res, { data, message: 'Password berhasil direset. Salin sekarang — hanya ditampilkan sekali.' });
  }),
  changePassword: catchAsync(async (req, res) => { await svc.changePassword(req.params.id, req.body); return success(res, { message: 'Password diubah' }); }),
};
