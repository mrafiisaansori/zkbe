const router = require('express').Router();
const ctrl = require('../controllers/subscriptionController');
const validate = require('../middlewares/validate');
const v = require('../validations');
const { requireSuperadmin, requireRole, forbidGudang, ADMIN } = require('../middlewares/role');

/**
 * @swagger
 * tags: [{ name: Subscription, description: Upgrade PRO/BUSINESS via QRIS dinamis Midtrans }]
 */

// Role Gudang TIDAK boleh mengakses Langganan/Billing. Super admin tetap bisa.
router.use(forbidGudang);

// ----- Setting langganan (baca: semua user login; ubah: super admin) -----
router.get('/setting', ctrl.getSetting);
router.put('/setting', requireSuperadmin, validate(v.subscription.setting), ctrl.updateSetting);

// ----- Merchant (admin toko) -----
router.get('/billing', ctrl.billing);
router.post('/payment', requireRole(ADMIN), validate(v.subscription.create), ctrl.createPayment);
router.get('/payment/:id/status', requireRole(ADMIN), validate(v.subscription.status), ctrl.paymentStatus);

// ----- Super admin: kelola pembayaran langganan -----
router.get('/payments', requireSuperadmin, ctrl.listPayments);
router.get('/payments/:id', requireSuperadmin, ctrl.getPayment);

// ----- Super admin: laporan pendapatan platform (read-only) -----
router.get('/revenue', requireSuperadmin, validate(v.subscription.revenue), ctrl.revenueSummary);
router.get('/revenue/chart', requireSuperadmin, validate(v.subscription.revenueChart), ctrl.revenueChart);

module.exports = router;
