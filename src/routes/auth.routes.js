const router = require('express').Router();
const ctrl = require('../controllers/authController');
const validate = require('../middlewares/validate');
const v = require('../validations');

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Login, registrasi merchant & verifikasi OTP (publik)
 *
 * /auth/login:
 *   post:
 *     summary: Login user (super admin / admin merchant / kasir)
 *     description: Mengembalikan JWT (token) + data user. Token dikirim sebagai Bearer di request berikutnya.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login berhasil (data.token + data.user) }
 *       401: { description: Password salah }
 *       403: { description: Toko belum aktif / ditangguhkan }
 *       404: { description: User tidak ditemukan }
 *
 * /auth/register:
 *   post:
 *     summary: Registrasi merchant baru (kirim OTP ke email)
 *     tags: [Auth]
 *     responses:
 *       201: { description: OTP terkirim }
 *       409: { description: Email / nomor HP / username sudah dipakai }
 *       502: { description: Gagal kirim email OTP }
 *
 * /auth/verify-otp:
 *   post:
 *     summary: Verifikasi OTP & aktifkan merchant
 *     tags: [Auth]
 *     responses:
 *       200: { description: Merchant aktif, Admin Merchant dibuat }
 *       400: { description: OTP salah / kedaluwarsa }
 *
 * /auth/resend-otp:
 *   post:
 *     summary: Kirim ulang OTP (dengan cooldown)
 *     tags: [Auth]
 *     responses:
 *       200: { description: OTP baru terkirim }
 *       429: { description: Masih dalam masa cooldown }
 */
router.post('/login', validate(v.auth.login), ctrl.login);
router.post('/register', validate(v.auth.register), ctrl.register);
router.post('/verify-otp', validate(v.auth.verifyOtp), ctrl.verifyOtp);
router.post('/resend-otp', validate(v.auth.resendOtp), ctrl.resendOtp);

// Lupa password (publik): minta OTP, kirim ulang, lalu reset dengan OTP.
router.post('/forgot-password', validate(v.auth.forgotPassword), ctrl.forgotPassword);
router.post('/forgot-password/resend', validate(v.auth.forgotPassword), ctrl.resendResetOtp);
router.post('/reset-password', validate(v.auth.resetPassword), ctrl.resetPassword);

module.exports = router;
