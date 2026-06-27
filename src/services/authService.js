const { Pengguna, Merchant } = require('../models');
const ApiError = require('../utils/ApiError');
const { verifyPassword, hashPassword, isHashed } = require('../utils/password');
const { signToken } = require('../utils/jwt');
const { normalizePlan } = require('../utils/plan');

const SUPERADMIN = 0;

function levelToRole(level) {
  if (level === 0) return 'superadmin';
  if (level === 1) return 'admin';
  if (level === 2) return 'kasir';
  if (level === 3) return 'gudang';
  return 'unknown';
}

/**
 * Login multi-tenant.
 * - Cari user by username (global; rute publik, tanpa scope).
 * - Verifikasi password (bcrypt, upgrade-on-login untuk data lama).
 * - Selain super admin: pastikan merchant ada & STATUS = 'active'.
 * - Terbitkan JWT berisi { id, nama, merchant_id, level, role }.
 */
async function login({ username, password }) {
  const user = await Pengguna.findOne({ where: { USERNAME: username } });
  if (!user) throw new ApiError(404, 'Username atau password tidak sesuai.');

  const ok = await verifyPassword(password, user.PASSWORD);
  if (!ok) throw new ApiError(401, 'Username atau password tidak sesuai.');

  if (!isHashed(user.PASSWORD)) {
    try { await user.update({ PASSWORD: await hashPassword(password) }); } catch (_) { /* abaikan */ }
  }

  const level = user.LEVEL;
  const role = levelToRole(level);

  let merchant = null;
  if (level !== SUPERADMIN) {
    if (!user.MERCHANT_ID) throw new ApiError(403, 'Akun ini belum terhubung ke toko mana pun.');
    merchant = await Merchant.findByPk(user.MERCHANT_ID);
    if (!merchant) throw new ApiError(403, 'Toko tidak ditemukan.');
    if (merchant.STATUS !== 'active') {
      throw new ApiError(403, 'Toko belum aktif atau sedang ditangguhkan. Hubungi admin.');
    }
    // Lazy downgrade: bila PRO sudah kedaluwarsa, kembalikan ke FREE.
    await normalizePlan(merchant);
  }

  const token = signToken({
    id: user.ID,
    nama: user.NAMA,
    merchant_id: user.MERCHANT_ID ?? null,
    level,
    role,
  });

  return {
    token,
    user: {
      id: user.ID,
      nama: user.NAMA,
      username: user.USERNAME,
      level,
      role,
      merchant_id: user.MERCHANT_ID ?? null,
      merchant: merchant ? {
        id: merchant.ID, nama: merchant.NAMA, status: merchant.STATUS,
        plan: merchant.PLAN, pro_expires_at: merchant.PRO_EXPIRES_AT,
        onboarding_done: Number(merchant.ONBOARDING_DONE) === 1,
        profile_complete: Boolean(
          String(merchant.NAMA || '').trim()
          && String(merchant.ADDRESS || '').trim()
          && String(merchant.PHONE || '').trim(),
        ),
      } : null,
    },
  };
}

// Profil user dari token (req.user) + data merchant terkait.
async function me(reqUser) {
  const out = { ...reqUser };
  if (reqUser.merchant_id) {
    const m = await Merchant.findByPk(reqUser.merchant_id);
    if (m) {
      await normalizePlan(m);
      // Kelengkapan data wajib merchant: nama toko, alamat, dan no. telepon.
      const profileComplete = Boolean(
        String(m.NAMA || '').trim()
        && String(m.ADDRESS || '').trim()
        && String(m.PHONE || '').trim(),
      );
      out.merchant = {
        id: m.ID, nama: m.NAMA, status: m.STATUS, invoice_prefix: m.INVOICE_PREFIX,
        plan: m.PLAN, pro_expires_at: m.PRO_EXPIRES_AT,
        onboarding_done: Number(m.ONBOARDING_DONE) === 1,
        profile_complete: profileComplete,
      };
    }
  }
  return out;
}

module.exports = { login, me, levelToRole };
