const router = require('express').Router();
const ctrl = require('../controllers/accountController');
const validate = require('../middlewares/validate');
const v = require('../validations');
const { requireRole, ADMIN } = require('../middlewares/role');

/**
 * Akun sendiri (sudah login; identitas dari token, bukan frontend).
 * - Ubah password: semua role (admin & kasir).
 * - Ganti email: hanya Admin Merchant (email = identitas akun/toko).
 */
router.post('/change-password', validate(v.account.changePassword), ctrl.changePassword);

router.post('/email/request', requireRole(ADMIN), validate(v.account.emailRequest), ctrl.requestEmail);
router.post('/email/verify', requireRole(ADMIN), validate(v.account.emailVerify), ctrl.verifyEmail);
router.post('/email/resend', requireRole(ADMIN), ctrl.resendEmail);

module.exports = router;
