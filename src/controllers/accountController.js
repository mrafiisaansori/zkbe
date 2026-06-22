const svc = require('../services/accountService');
const catchAsync = require('../utils/catchAsync');
const { success } = require('../utils/response');

module.exports = {
  // Ubah password sendiri (admin & kasir). userId dari token.
  changePassword: catchAsync(async (req, res) => {
    await svc.changeOwnPassword(req.user.id, req.body);
    return success(res, { message: 'Password berhasil diubah.' });
  }),

  // Ganti email akun/toko (admin merchant): request -> verify (OTP).
  requestEmail: catchAsync(async (req, res) =>
    success(res, { data: await svc.requestEmailChange(req.user, req.body), message: 'Kode OTP telah dikirim ke email baru Anda.' })),

  verifyEmail: catchAsync(async (req, res) =>
    success(res, { data: await svc.verifyEmailChange(req.user, req.body), message: 'Email berhasil diperbarui.' })),

  resendEmail: catchAsync(async (req, res) =>
    success(res, { data: await svc.resendEmailChange(req.user), message: 'Kode OTP baru telah dikirim.' })),
};
