const authService = require('../services/authService');
const registrationService = require('../services/registrationService');
const passwordResetService = require('../services/passwordResetService');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/response');

const login = catchAsync(async (req, res) => {
  const data = await authService.login(req.body);
  return success(res, { data, message: 'Login berhasil' });
});

// Profil user dari token (rute terproteksi).
const me = catchAsync(async (req, res) => {
  const data = await authService.me(req.user);
  return success(res, { data });
});

// Registrasi merchant (publik) - kirim OTP ke email.
const register = catchAsync(async (req, res) => {
  const data = await registrationService.register(req.body);
  return created(res, data, 'Kode OTP telah dikirim ke email Anda.');
});

// Verifikasi OTP -> aktifkan merchant + buat Admin Merchant.
const verifyOtp = catchAsync(async (req, res) => {
  const data = await registrationService.verifyOtpAndActivate(req.body);
  return success(res, { data, message: data.message });
});

// Kirim ulang OTP (cooldown).
const resendOtp = catchAsync(async (req, res) => {
  const data = await registrationService.resendOtp(req.body);
  return success(res, { data, message: 'OTP baru telah dikirim.' });
});

// ===== Lupa password (publik) =====
// Pesan selalu generik agar tidak membocorkan apakah email terdaftar.
const forgotPassword = catchAsync(async (req, res) => {
  const data = await passwordResetService.forgot(req.body);
  return success(res, { data, message: data.message });
});

const resendResetOtp = catchAsync(async (req, res) => {
  const data = await passwordResetService.resend(req.body);
  return success(res, { data, message: data.message });
});

const resetPassword = catchAsync(async (req, res) => {
  const data = await passwordResetService.reset(req.body);
  return success(res, { data, message: data.message });
});

module.exports = {
  login, me, register, verifyOtp, resendOtp,
  forgotPassword, resendResetOtp, resetPassword,
};
