const { Op } = require('sequelize');
const {
  sequelize, Pengguna, Merchant, Identitas, EmailChangeOtp,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { verifyPassword, hashPassword } = require('../utils/password');
const { generateOtp, hashOtp, verifyOtp } = require('../utils/otp');
const { sendEmailChangeOtp } = require('../utils/mailer');
const env = require('../config/env');

const normEmail = (s) => String(s || '').trim().toLowerCase();

/**
 * Ubah password sendiri (admin & kasir). Wajib password lama benar.
 * userId diambil dari token (req.user.id), bukan dari frontend.
 */
async function changeOwnPassword(userId, { old_password, new_password }) {
  const u = await Pengguna.findByPk(userId);
  if (!u) throw new ApiError(404, 'Akun tidak ditemukan.');
  const ok = await verifyPassword(old_password, u.PASSWORD);
  if (!ok) throw new ApiError(400, 'Password lama tidak sesuai.');
  await u.update({ PASSWORD: await hashPassword(new_password) });
  return true;
}

// Pastikan email baru tidak dipakai merchant lain (atau merchant ini sendiri).
async function assertEmailFree(email, merchantId) {
  const dup = await Merchant.findOne({ where: { EMAIL: email, ID: { [Op.ne]: merchantId } } });
  if (dup) throw new ApiError(409, 'Email sudah digunakan oleh toko lain.');
}

/**
 * Step 1 - Minta ganti email: verifikasi PASSWORD existing, lalu kirim OTP ke
 * EMAIL BARU. Email belum berubah sampai OTP diverifikasi.
 */
async function requestEmailChange(user, { password, new_email }) {
  const merchantId = user.merchant_id;
  if (!merchantId) throw new ApiError(403, 'Akun tidak terhubung ke toko.');

  const u = await Pengguna.findByPk(user.id);
  if (!u) throw new ApiError(404, 'Akun tidak ditemukan.');
  if (!(await verifyPassword(password, u.PASSWORD))) {
    throw new ApiError(400, 'Password tidak sesuai.');
  }

  const email = normEmail(new_email);
  const merchant = await Merchant.findByPk(merchantId);
  if (merchant && normEmail(merchant.EMAIL) === email) {
    throw new ApiError(400, 'Email baru sama dengan email saat ini.');
  }
  await assertEmailFree(email, merchantId);

  // Bersihkan permintaan lama yang belum dipakai.
  await EmailChangeOtp.destroy({ where: { MERCHANT_ID: merchantId, USED: false } });

  const otp = generateOtp();
  const now = new Date();
  await EmailChangeOtp.create({
    MERCHANT_ID: merchantId,
    ID_USER: u.ID,
    NEW_EMAIL: email,
    OTP_HASH: await hashOtp(otp),
    EXPIRES_AT: new Date(now.getTime() + env.otp.ttlMinutes * 60 * 1000),
    LAST_SENT_AT: now,
    ATTEMPTS: 0,
    USED: false,
  });

  await sendEmailChangeOtp(email, { otp, storeName: merchant ? merchant.NAMA : '' });
  return { new_email: email, cooldown: env.otp.resendCooldownSeconds, expires_in_minutes: env.otp.ttlMinutes };
}

/**
 * Step 2 - Verifikasi OTP & simpan email baru (atomik). Sekali pakai.
 */
async function verifyEmailChange(user, { otp }) {
  const merchantId = user.merchant_id;
  if (!merchantId) throw new ApiError(403, 'Akun tidak terhubung ke toko.');

  const row = await EmailChangeOtp.findOne({
    where: { MERCHANT_ID: merchantId, USED: false },
    order: [['ID', 'DESC']],
  });
  if (!row) throw new ApiError(400, 'Tidak ada permintaan ganti email. Mulai dari awal.');
  if (new Date() > new Date(row.EXPIRES_AT)) {
    throw new ApiError(400, 'Kode OTP sudah kedaluwarsa. Silakan minta kirim ulang.');
  }
  if (row.ATTEMPTS >= env.otp.maxAttempts) {
    throw new ApiError(429, 'Terlalu banyak percobaan. Silakan minta kirim ulang OTP.');
  }
  if (!(await verifyOtp(otp, row.OTP_HASH))) {
    await row.update({ ATTEMPTS: row.ATTEMPTS + 1 });
    throw new ApiError(400, 'Kode OTP salah.');
  }

  // Re-cek keunikan saat commit (hindari race).
  await assertEmailFree(row.NEW_EMAIL, merchantId);

  await sequelize.transaction(async (t) => {
    const m = await Merchant.findByPk(merchantId, { transaction: t });
    if (!m) throw new ApiError(404, 'Toko tidak ditemukan.');
    await m.update({ EMAIL: row.NEW_EMAIL }, { transaction: t });
    // Selaraskan email identitas toko (untuk struk/katalog) bila ada.
    await Identitas.update(
      { EMAIL: row.NEW_EMAIL },
      { where: { MERCHANT_ID: merchantId }, transaction: t },
    );
    await row.update({ USED: true }, { transaction: t });
  });

  return { email: row.NEW_EMAIL };
}

/**
 * Step 1b - Kirim ulang OTP ganti email (cooldown).
 */
async function resendEmailChange(user) {
  const merchantId = user.merchant_id;
  if (!merchantId) throw new ApiError(403, 'Akun tidak terhubung ke toko.');

  const row = await EmailChangeOtp.findOne({
    where: { MERCHANT_ID: merchantId, USED: false },
    order: [['ID', 'DESC']],
  });
  if (!row) throw new ApiError(404, 'Tidak ada permintaan ganti email.');

  const now = new Date();
  const elapsed = (now - new Date(row.LAST_SENT_AT)) / 1000;
  const cooldown = env.otp.resendCooldownSeconds;
  if (elapsed < cooldown) {
    throw new ApiError(429, `Mohon tunggu ${Math.ceil(cooldown - elapsed)} detik sebelum mengirim ulang OTP.`);
  }

  const otp = generateOtp();
  await row.update({
    OTP_HASH: await hashOtp(otp),
    EXPIRES_AT: new Date(now.getTime() + env.otp.ttlMinutes * 60 * 1000),
    LAST_SENT_AT: now,
    ATTEMPTS: 0,
  });
  const merchant = await Merchant.findByPk(merchantId);
  await sendEmailChangeOtp(row.NEW_EMAIL, { otp, storeName: merchant ? merchant.NAMA : '' });
  return { cooldown };
}

module.exports = { changeOwnPassword, requestEmailChange, verifyEmailChange, resendEmailChange };
