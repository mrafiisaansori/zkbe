const { Op } = require('sequelize');
const {
  sequelize, Merchant, Pengguna, Identitas, Qris, JenisBayar, RegistrationOtp,
} = require('../models');
const ApiError = require('../utils/ApiError');
const { hashPassword } = require('../utils/password');
const { generateOtp, hashOtp, verifyOtp } = require('../utils/otp');
const { sendOtpEmail } = require('../utils/mailer');
const { makeInvoicePrefix } = require('../utils/invoicePrefix');
const env = require('../config/env');

const norm = (s) => String(s || '').trim();
const normEmail = (s) => norm(s).toLowerCase();
const normPhone = (s) => norm(s).replace(/[^\d+]/g, '');

// Pastikan email & nomor HP unik (lintas merchant) dan username belum dipakai.
async function assertUnique({ email, phone, username }) {
  const existsEmail = await Merchant.findOne({ where: { EMAIL: email } });
  if (existsEmail) throw new ApiError(409, 'Email sudah terdaftar pada merchant lain.');

  const existsPhone = await Merchant.findOne({ where: { PHONE: phone } });
  if (existsPhone) throw new ApiError(409, 'Nomor HP/WhatsApp sudah terdaftar pada merchant lain.');

  const existsUser = await Pengguna.findOne({ where: { USERNAME: username } });
  if (existsUser) throw new ApiError(409, 'Username sudah digunakan, silakan pilih yang lain.');
}

/**
 * Step 1 - Registrasi merchant: simpan data PENDING + kirim OTP ke email.
 * Belum membuat merchant/user sungguhan sampai OTP terverifikasi.
 */
async function register(data) {
  const email = normEmail(data.email);
  const phone = normPhone(data.phone);
  const username = norm(data.username);

  // Konfirmasi password hanya dicek bila dikirim (form ringkas tidak mengirimnya).
  if (data.password_confirmation && data.password !== data.password_confirmation) {
    throw new ApiError(422, 'Konfirmasi password tidak cocok.');
  }
  await assertUnique({ email, phone, username });

  // Bersihkan pendaftaran pending lama untuk email yang sama.
  await RegistrationOtp.destroy({ where: { EMAIL: email, VERIFIED: false } });

  const passwordHash = await hashPassword(data.password);
  const payload = {
    owner_name: norm(data.owner_name),
    store_name: norm(data.store_name) || norm(data.owner_name), // default: pakai nama bila toko belum diisi
    email,
    phone,
    address: norm(data.address),
    city: norm(data.city),
    province: norm(data.province),
    business_category: norm(data.business_category),
    username,
    password_hash: passwordHash,
  };

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + env.otp.ttlMinutes * 60 * 1000);

  const row = await RegistrationOtp.create({
    EMAIL: email,
    PHONE: phone,
    OTP_HASH: otpHash,
    PAYLOAD: JSON.stringify(payload),
    EXPIRES_AT: expiresAt,
    LAST_SENT_AT: now,
    ATTEMPTS: 0,
    VERIFIED: false,
  });

  try {
    await sendOtpEmail(email, { otp, storeName: payload.store_name, ownerName: payload.owner_name });
  } catch (err) {
    // SMTP gagal -> batalkan pendaftaran pending agar bisa dicoba ulang.
    await row.destroy().catch(() => {});
    throw new ApiError(502, 'Gagal mengirim email OTP. Periksa konfigurasi SMTP / alamat email.');
  }

  return { email, expires_in_minutes: env.otp.ttlMinutes };
}

/**
 * Step 2 - Verifikasi OTP. Jika benar: buat Merchant (active) + Admin Merchant
 * + data default (identitas, QRIS, jenis bayar). Dijalankan atomik.
 */
async function verifyOtpAndActivate({ email, otp }) {
  const mail = normEmail(email);
  const row = await RegistrationOtp.findOne({
    where: { EMAIL: mail, VERIFIED: false },
    order: [['ID', 'DESC']],
  });
  if (!row) throw new ApiError(404, 'Tidak ada pendaftaran untuk email ini. Silakan daftar ulang.');

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

  const p = JSON.parse(row.PAYLOAD);

  // Re-cek keunikan saat aktivasi (hindari race).
  await assertUnique({ email: p.email, phone: p.phone, username: p.username });

  const result = await sequelize.transaction(async (t) => {
    const invoicePrefix = await makeInvoicePrefix(p.store_name, { transaction: t });
    const merchant = await Merchant.create({
      NAMA: p.store_name,
      OWNER_NAME: p.owner_name,
      EMAIL: p.email,
      PHONE: p.phone,
      ADDRESS: p.address,
      CITY: p.city,
      PROVINCE: p.province,
      BUSINESS_CATEGORY: p.business_category,
      INVOICE_PREFIX: invoicePrefix,
      STATUS: 'active',
    }, { transaction: t });

    // Slug katalog publik: dari nama toko + ID (dijamin unik).
    const slugBase = norm(p.store_name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'toko';
    await merchant.update({ SLUG: `${slugBase}-${merchant.ID}` }, { transaction: t });

    const admin = await Pengguna.create({
      NAMA: p.owner_name,
      USERNAME: p.username,
      PASSWORD: p.password_hash, // sudah hash
      LEVEL: 1, // Admin Merchant
      TELP: p.phone,
      MERCHANT_ID: merchant.ID,
    }, { transaction: t });

    // Data default per merchant.
    await Identitas.create({
      NAMA: p.store_name, ALAMAT: p.address, NO_TELP: p.phone, EMAIL: p.email,
      MERCHANT_ID: merchant.ID,
    }, { transaction: t });
    await Qris.create({ IS_ACTIVE: false, MERCHANT_ID: merchant.ID }, { transaction: t });
    await JenisBayar.bulkCreate([
      { NAMA: 'Cash', MERCHANT_ID: merchant.ID },
      { NAMA: 'QRIS', MERCHANT_ID: merchant.ID },
      { NAMA: 'Transfer', MERCHANT_ID: merchant.ID },
    ], { transaction: t });

    await row.update({ VERIFIED: true }, { transaction: t });
    return { merchant, admin };
  });

  return {
    merchant_id: result.merchant.ID,
    username: result.admin.USERNAME,
    message: 'Verifikasi berhasil. Toko Anda aktif, silakan login sebagai Admin Merchant.',
  };
}

/**
 * Resend OTP dengan cooldown agar tidak spam.
 */
async function resendOtp({ email }) {
  const mail = normEmail(email);
  const row = await RegistrationOtp.findOne({
    where: { EMAIL: mail, VERIFIED: false },
    order: [['ID', 'DESC']],
  });
  if (!row) throw new ApiError(404, 'Tidak ada pendaftaran untuk email ini.');

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

  const p = JSON.parse(row.PAYLOAD);
  try {
    await sendOtpEmail(mail, { otp, storeName: p.store_name, ownerName: p.owner_name });
  } catch (err) {
    throw new ApiError(502, 'Gagal mengirim ulang email OTP. Coba lagi nanti.');
  }

  return { email: mail, cooldown, expires_in_minutes: env.otp.ttlMinutes };
}

module.exports = { register, verifyOtpAndActivate, resendOtp, makeInvoicePrefix };
