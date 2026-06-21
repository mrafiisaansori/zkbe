const { Pengguna, Merchant, PasswordResetOtp } = require('../models');
const ApiError = require('../utils/ApiError');
const { hashPassword } = require('../utils/password');
const { generateOtp, hashOtp, verifyOtp } = require('../utils/otp');
const { sendPasswordResetEmail } = require('../utils/mailer');
const env = require('../config/env');

const normEmail = (s) => String(s || '').trim().toLowerCase();

// Pesan generik — TIDAK membocorkan apakah email terdaftar atau tidak.
const GENERIC = 'Jika email terdaftar, instruksi reset password akan dikirim.';

/**
 * Resolusi email -> akun user yang berhak reset.
 * Skema saat ini: email tersimpan di m_merchant. Akun yang direset adalah
 * Admin Merchant (LEVEL 1) milik merchant tersebut.
 * Mengembalikan { user, name } atau null bila tidak ada.
 */
async function resolveUserByEmail(email) {
  const merchant = await Merchant.findOne({ where: { EMAIL: email } });
  if (!merchant) return null;
  const user = await Pengguna.findOne({ where: { MERCHANT_ID: merchant.ID, LEVEL: 1 } });
  if (!user) return null;
  return { user, name: merchant.OWNER_NAME || user.NAMA };
}

/**
 * Step 1 - Minta reset: kirim OTP ke email bila terdaftar.
 * Selalu mengembalikan pesan generik (anti user-enumeration).
 */
async function forgot({ email }) {
  const mail = normEmail(email);
  const resolved = await resolveUserByEmail(mail);

  // Email tidak terdaftar: tetap balas sukses generik, tanpa kirim apa pun.
  if (!resolved) return { message: GENERIC };

  // Bersihkan permintaan lama yang belum dipakai untuk email ini.
  await PasswordResetOtp.destroy({ where: { EMAIL: mail, USED: false } });

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + env.otp.ttlMinutes * 60 * 1000);

  await PasswordResetOtp.create({
    EMAIL: mail,
    ID_USER: resolved.user.ID,
    OTP_HASH: otpHash,
    EXPIRES_AT: expiresAt,
    LAST_SENT_AT: now,
    ATTEMPTS: 0,
    USED: false,
  });

  try {
    await sendPasswordResetEmail(mail, { otp, name: resolved.name });
  } catch (_) {
    // Jangan bocorkan kegagalan SMTP sebagai sinyal keberadaan email.
    // Tetap balas generik; admin bisa coba lagi (resend).
  }

  return { message: GENERIC };
}

/**
 * Step 2 - Kirim ulang OTP (cooldown). Tetap generik bila email tidak ada.
 */
async function resend({ email }) {
  const mail = normEmail(email);
  const row = await PasswordResetOtp.findOne({
    where: { EMAIL: mail, USED: false },
    order: [['ID', 'DESC']],
  });
  if (!row) return { message: GENERIC };

  const now = new Date();
  const elapsed = (now - new Date(row.LAST_SENT_AT)) / 1000;
  const cooldown = env.otp.resendCooldownSeconds;
  if (elapsed < cooldown) {
    const wait = Math.ceil(cooldown - elapsed);
    throw new ApiError(429, `Mohon tunggu ${wait} detik sebelum mengirim ulang OTP.`);
  }

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(now.getTime() + env.otp.ttlMinutes * 60 * 1000);
  await row.update({ OTP_HASH: otpHash, EXPIRES_AT: expiresAt, LAST_SENT_AT: now, ATTEMPTS: 0 });

  const resolved = await resolveUserByEmail(mail);
  try {
    await sendPasswordResetEmail(mail, { otp, name: resolved ? resolved.name : '' });
  } catch (_) { /* generik */ }

  return { message: GENERIC, cooldown };
}

/**
 * Step 3 - Verifikasi OTP & set password baru (hash). Sekali pakai.
 */
async function reset({ email, otp, new_password }) {
  const mail = normEmail(email);
  const row = await PasswordResetOtp.findOne({
    where: { EMAIL: mail, USED: false },
    order: [['ID', 'DESC']],
  });
  // Pesan sengaja umum agar tidak membocorkan keberadaan email.
  if (!row) throw new ApiError(400, 'Kode OTP salah atau sudah kedaluwarsa.');

  if (new Date() > new Date(row.EXPIRES_AT)) {
    throw new ApiError(400, 'Kode OTP sudah kedaluwarsa. Silakan minta kirim ulang.');
  }
  if (row.ATTEMPTS >= env.otp.maxAttempts) {
    throw new ApiError(429, 'Terlalu banyak percobaan. Silakan minta kirim ulang OTP.');
  }

  const valid = await verifyOtp(otp, row.OTP_HASH);
  if (!valid) {
    await row.update({ ATTEMPTS: row.ATTEMPTS + 1 });
    throw new ApiError(400, 'Kode OTP salah.');
  }

  const user = await Pengguna.findByPk(row.ID_USER);
  if (!user) throw new ApiError(400, 'Akun tidak ditemukan.');

  await user.update({ PASSWORD: await hashPassword(new_password) });
  await row.update({ USED: true });

  return { message: 'Password berhasil diperbarui. Silakan login dengan password baru Anda.' };
}

module.exports = { forgot, resend, reset };
