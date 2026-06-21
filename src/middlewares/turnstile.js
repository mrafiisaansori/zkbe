const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Verifikasi token Cloudflare Turnstile pada form publik (login, register, OTP,
 * forgot/reset password). AKTIF hanya bila TURNSTILE_SECRET_KEY di-set (production);
 * di lokal tanpa secret -> dilewati supaya dev lancar.
 *
 * Token dikirim frontend lewat body `turnstile_token` (atau header cf-turnstile-response).
 * Setelah diverifikasi, field dihapus dari body agar validasi Joi tidak menolaknya.
 */
module.exports = async function verifyTurnstile(req, res, next) {
  const secret = env.turnstile.secret;
  if (!secret) return next(); // nonaktif (dev / belum dikonfigurasi)

  const token = (req.body && req.body.turnstile_token) || req.headers['cf-turnstile-response'];
  if (!token) return next(new ApiError(400, 'Verifikasi keamanan wajib diselesaikan.'));

  try {
    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', String(token));
    const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.ip;
    if (ip) params.append('remoteip', String(ip).split(',')[0].trim());

    const resp = await fetch(VERIFY_URL, { method: 'POST', body: params });
    const data = await resp.json();

    if (!data.success) return next(new ApiError(400, 'Verifikasi keamanan gagal. Silakan coba lagi.'));

    if (req.body) delete req.body.turnstile_token; // agar tidak mengganggu validasi Joi
    return next();
  } catch (_) {
    return next(new ApiError(502, 'Tidak dapat memverifikasi keamanan. Coba lagi.'));
  }
};
