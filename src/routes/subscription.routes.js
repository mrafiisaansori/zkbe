const router = require('express').Router();
const ctrl = require('../controllers/subscriptionController');
const validate = require('../middlewares/validate');
const v = require('../validations');
const { requireSuperadmin } = require('../middlewares/role');
const { uploadSubscriptionQris, uploadPaymentProof } = require('../middlewares/upload');
const tenantContext = require('../middlewares/tenantContext');

/**
 * @swagger
 * tags: [{ name: Subscription, description: Langganan PRO Zona Kasir (QRIS manual) }]
 */

// ----- Setting langganan (baca: semua user login; ubah: super admin) -----
router.get('/setting', ctrl.getSetting);
router.put('/setting', requireSuperadmin, uploadSubscriptionQris('image'), validate(v.subscription.setting), ctrl.updateSetting);

// ----- Merchant (admin toko) -----
router.get('/billing', ctrl.billing);
router.post('/payment', validate(v.subscription.create), ctrl.createPayment);
router.post('/payment/:id/submit', uploadPaymentProof('bukti'), tenantContext, ctrl.submitPayment);

// ----- Super admin: kelola pembayaran langganan -----
router.get('/payments', requireSuperadmin, ctrl.listPayments);
router.get('/payments/:id', requireSuperadmin, ctrl.getPayment);
router.post('/payments/:id/verify', requireSuperadmin, ctrl.verify);
router.post('/payments/:id/reject', requireSuperadmin, validate(v.subscription.reject), ctrl.reject);

module.exports = router;
