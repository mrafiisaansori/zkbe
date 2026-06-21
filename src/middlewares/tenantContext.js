const { runWithTenant } = require('../utils/tenancy');

const SUPERADMIN = 0;

/**
 * Re-assert konteks tenant (AsyncLocalStorage) dari req.user.
 *
 * Beberapa middleware berbasis stream — terutama multer (upload file) — dapat
 * MEMUTUS propagasi AsyncLocalStorage, sehingga konteks tenant yang dibuka di
 * authJwt hilang di handler setelahnya. Akibatnya scoping merchant tidak aktif
 * (mis. MERCHANT_ID tidak terisi saat simpan produk, atau filter find lolos).
 *
 * Pasang middleware ini SETELAH multer pada rute multipart agar konteks tenant
 * dibangun ulang dari req.user (yang selalu bertahan di object request).
 */
module.exports = function tenantContext(req, res, next) {
  if (!req.user) return next();
  const ctx = {
    userId: req.user.id,
    level: req.user.level,
    superadmin: req.user.level === SUPERADMIN,
    merchantId: req.user.level === SUPERADMIN ? null : (req.user.merchant_id ?? null),
  };
  return runWithTenant(ctx, () => next());
};
