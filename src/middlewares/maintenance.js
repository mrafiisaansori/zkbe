const { SubscriptionSetting } = require('../models');

// Blokir akses saat Maintenance Mode aktif — KECUALI Super Admin (level 0),
// agar Super Admin tetap bisa login & menonaktifkan maintenance.
// Dipasang setelah authJwt sehingga req.user sudah terisi.
module.exports = async function maintenanceGuard(req, res, next) {
  try {
    if (req.user && Number(req.user.level) === 0) return next();
    const row = await SubscriptionSetting.findByPk(1);
    if (row && Number(row.MAINTENANCE_MODE) === 1) {
      return res.status(503).json({
        success: false,
        code: 'MAINTENANCE',
        message: row.MAINTENANCE_MESSAGE
          || 'Aplikasi sedang dalam pemeliharaan. Silakan coba beberapa saat lagi.',
      });
    }
    return next();
  } catch (e) {
    // Bila gagal cek (mis. DB sesaat), jangan kunci sistem.
    return next();
  }
};
