const router = require('express').Router();
const ctrl = require('../controllers/openBillController');
const validate = require('../middlewares/validate');
const v = require('../validations');

/**
 * @swagger
 * tags:
 *   - name: OpenBill
 *     description: Pesanan terbuka / bayar di akhir (coffee shop, cafe, resto). Semua ter-scope merchant.
 *
 * /open-bill:
 *   get:
 *     summary: Daftar open bill (filter status & pencarian nama/meja/no bill)
 *     tags: [OpenBill]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: status, schema: { type: string, enum: [OPEN, PAID, CANCELLED] } }
 *       - { in: query, name: search, schema: { type: string } }
 *     responses: { 200: { description: List open bill } }
 *   post:
 *     summary: Buat open bill (status OPEN). Stok TIDAK dikurangi sampai dibayar.
 *     tags: [OpenBill]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               customer_name: { type: string }
 *               table_no: { type: string }
 *               note: { type: string }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [id_produk, qty]
 *                   properties:
 *                     id_produk: { type: integer }
 *                     qty: { type: number }
 *                     note: { type: string }
 *     responses: { 201: { description: Open bill dibuat } }
 *
 * /open-bill/{id}:
 *   get:
 *     summary: Detail open bill (header + item)
 *     tags: [OpenBill]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Detail }, 404: { description: Tidak ditemukan / merchant lain } }
 *   put:
 *     summary: Ubah open bill (hanya status OPEN) - ganti item & info
 *     tags: [OpenBill]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Diperbarui } }
 *
 * /open-bill/{id}/pay:
 *   post:
 *     summary: Bayar open bill (OPEN -> PAID). Membuat transaksi penjualan + kurangi stok.
 *     tags: [OpenBill]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Dibayar } }
 *
 * /open-bill/{id}/cancel:
 *   post:
 *     summary: Batalkan open bill (OPEN -> CANCELLED)
 *     tags: [OpenBill]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Dibatalkan } }
 */
router.get('/', validate(v.openBill.list), ctrl.list);
router.post('/', validate(v.openBill.create), ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', validate(v.openBill.update), ctrl.update);
router.post('/:id/pay', validate(v.openBill.pay), ctrl.pay);
router.post('/:id/pay-partial', validate(v.openBill.payPartial), ctrl.payPartial);
router.post('/:id/pay-partial/qris/create', validate(v.openBill.payPartialQris), ctrl.createPartialQris);
router.post('/:id/cancel', ctrl.cancel);

module.exports = router;
