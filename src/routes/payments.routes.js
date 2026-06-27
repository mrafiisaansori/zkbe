const router = require('express').Router();
const ctrl = require('../controllers/paymentController');
const validate = require('../middlewares/validate');
const v = require('../validations');

/**
 * @swagger
 * tags:
 *   - name: Payments
 *     description: Payment gateway Midtrans (QRIS dinamis) - KHUSUS plan BUSINESS
 *
 * /payments/midtrans/qris/create:
 *   post:
 *     summary: Buat transaksi + QRIS dinamis Midtrans (BUSINESS)
 *     description: >
 *       Membuat transaksi penjualan (status bayar PENDING) lalu meminta QRIS
 *       dinamis sesuai nominal ke Midtrans. Hanya untuk merchant plan BUSINESS.
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: QRIS dibuat (qr_string / qr_url) }
 *       403: { description: Plan bukan BUSINESS }
 *
 * /payments/status/{transaction_id}:
 *   get:
 *     summary: Cek status pembayaran transaksi (polling kasir)
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: transaction_id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Status pembayaran lokal } }
 */
router.post('/midtrans/qris/create', validate(v.payment.createQris), ctrl.createQris);
router.get('/status/:transaction_id', validate(v.payment.status), ctrl.status);

module.exports = router;
