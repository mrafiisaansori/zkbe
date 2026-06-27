const ApiError = require('../utils/ApiError');

// Level: 0 = Super Admin, 1 = Admin Merchant, 2 = Kasir, 3 = Gudang.
const SUPERADMIN = 0;
const ADMIN = 1;
const KASIR = 2;
const GUDANG = 3;

/**
 * Role guard. Identitas diambil dari JWT (req.user) yang diset authJwt,
 * BUKAN dari header/input frontend. Super admin selalu diizinkan.
 */
function requireRole(...levels) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'Tidak terautentikasi'));
    const level = req.user.level;
    if (level === SUPERADMIN) return next(); // super admin akses penuh
    if (!levels.includes(level)) {
      return next(new ApiError(403, 'Akses ditolak untuk role ini'));
    }
    next();
  };
}

/**
 * Tolak level tertentu (mis. role Gudang dilarang akses Laporan/Pengaturan/
 * Langganan/Voucher). Super admin selalu diizinkan. Divalidasi di BACKEND,
 * bukan sekadar menyembunyikan menu di frontend.
 */
function forbidLevels(...levels) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'Tidak terautentikasi'));
    if (req.user.level === SUPERADMIN) return next();
    if (levels.includes(req.user.level)) {
      return next(new ApiError(403, 'Akses ditolak untuk role ini.'));
    }
    next();
  };
}

// Guard siap-pakai: blokir role Gudang.
const forbidGudang = forbidLevels(GUDANG);

// Hanya super admin.
function requireSuperadmin(req, res, next) {
  if (!req.user) return next(new ApiError(401, 'Tidak terautentikasi'));
  if (req.user.level !== SUPERADMIN) return next(new ApiError(403, 'Khusus Super Admin'));
  next();
}

module.exports = {
  requireRole, forbidLevels, forbidGudang, requireSuperadmin,
  SUPERADMIN, ADMIN, KASIR, GUDANG,
};
