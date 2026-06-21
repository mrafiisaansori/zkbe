const ApiError = require('../utils/ApiError');
const { verifyToken } = require('../utils/jwt');
const { runWithTenant } = require('../utils/tenancy');

const SUPERADMIN = 0;

/**
 * Middleware autentikasi JWT.
 * - Wajib header: Authorization: Bearer <token>.
 * - Set req.user = { id, merchant_id, level, role, nama }.
 * - Membuka konteks tenant (AsyncLocalStorage) untuk seluruh handler di bawahnya,
 *   sehingga query Sequelize otomatis ter-filter merchant_id (kecuali super admin).
 */
module.exports = function authJwt(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Token tidak ada. Silakan login kembali.'));
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (_) {
    return next(new ApiError(401, 'Sesi tidak valid atau kedaluwarsa. Silakan login kembali.'));
  }

  req.user = {
    id: payload.id,
    nama: payload.nama,
    merchant_id: payload.merchant_id ?? null,
    level: payload.level,
    role: payload.role,
  };

  const ctx = {
    userId: payload.id,
    level: payload.level,
    superadmin: payload.level === SUPERADMIN,
    merchantId: payload.level === SUPERADMIN ? null : (payload.merchant_id ?? null),
  };

  // Penting: jalankan next() di dalam konteks agar propagasi async terjaga.
  return runWithTenant(ctx, () => next());
};
