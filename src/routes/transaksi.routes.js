const router = require('express').Router();
const ctrl = require('../controllers/transaksiController');
const validate = require('../middlewares/validate');
const v = require('../validations');

/**
 * @swagger
 * tags:
 *   - name: Transaksi Keuangan
 *     description: Kas masuk/keluar (t_transaksi)
 *
 * /transaksi-keuangan:
 *   get:
 *     summary: Daftar transaksi keuangan
 *     tags: [Transaksi Keuangan]
 *     security: [{ basicAuth: [] }]
 *     parameters:
 *       - { in: query, name: tanggal, schema: { type: string, format: date } }
 *       - { in: query, name: tanggal_awal, schema: { type: string, format: date } }
 *       - { in: query, name: tanggal_akhir, schema: { type: string, format: date } }
 *     responses: { 200: { description: List } }
 *   post:
 *     summary: Catat transaksi keuangan
 *     tags: [Transaksi Keuangan]
 *     security: [{ basicAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nama, jenis, nominal, tanggal]
 *             properties:
 *               nama: { type: string, example: Bayar listrik }
 *               jenis: { type: string, enum: [M,K], description: "M=masuk, K=keluar" }
 *               nominal: { type: number, example: 150000 }
 *               tanggal: { type: string, format: date }
 *     responses: { 201: { description: Dicatat } }
 *
 * /transaksi-keuangan/{id}:
 *   delete:
 *     summary: Hapus transaksi keuangan
 *     tags: [Transaksi Keuangan]
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Dihapus } }
 */
router.get('/', validate(v.transaksi.list), ctrl.list);
router.post('/', validate(v.transaksi.create), ctrl.create);
router.delete('/:id', ctrl.remove);

module.exports = router;
