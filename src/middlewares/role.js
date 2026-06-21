const ApiError = require('../utils/ApiError');

// Level: 0 = Super Admin, 1 = Admin Merchant, 2 = Kasir.
const SUPERADMIN = 0;
const ADMIN = 1;
const KASIR = 2;

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

// Hanya super admin.
function requireSuperadmin(req, res, next) {
  if (!req.user) return next(new ApiError(401, 'Tidak terautentikasi'));
  if (req.user.level !== SUPERADMIN) return next(new ApiError(403, 'Khusus Super Admin'));
  next();
}

module.exports = { requireRole, requireSuperadmin, SUPERADMIN, ADMIN, KASIR };
