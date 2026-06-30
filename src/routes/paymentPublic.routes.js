const router = require('express').Router();
const ctrl = require('../controllers/paymentController');
const validate = require('../middlewares/validate');
const v = require('../validations');

/**
 * @swagger
 * /payments/midtrans/notification:
 *   post:
 *     summary: Webhook/notification dari Midtrans (PUBLIK, tanpa JWT)
 *     description: >
 *       Endpoint yang dipanggil server Midtrans saat status pembayaran berubah.
 *       Keamanan via verifikasi signature (sha512). merchant_id diturunkan dari
 *       order_id, bukan dari body. Setiap payload disimpan untuk audit.
 *     tags: [Payments]
 *     security: []
 *     responses:
 *       200: { description: Notifikasi diterima }
 *       403: { description: Signature tidak valid }
 */
// PUBLIK: tidak melewati authJwt (di-mount sebelum middleware auth di app.js).
router.post('/midtrans/notification', validate(v.payment.notification), ctrl.notification);

module.exports = router;
