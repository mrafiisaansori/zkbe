const router = require('express').Router();
const ctrl = require('../controllers/laporanController');
const validate = require('../middlewares/validate');
const v = require('../validations');

/**
 * @swagger
 * tags:
 *   - name: Laporan
 *     description: Laporan penjualan, pendapatan/laba-rugi, stok, penyusutan
 *
 * /laporan/penjualan:
 *   get:
 *     summary: Laporan penjualan per rentang tanggal & kasir
 *     tags: [Laporan]
 *     security: [{ basicAuth: [] }]
 *     parameters:
 *       - { in: query, name: tanggal_awal, required: true, schema: { type: string, format: date } }
 *       - { in: query, name: tanggal_akhir, required: true, schema: { type: string, format: date } }
 *       - { in: query, name: id_user, schema: { type: string }, description: "ID kasir atau 'all'" }
 *       - { in: query, name: status, schema: { type: integer, enum: [0,1] } }
 *     responses:
 *       200:
 *         description: Laporan penjualan
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { jumlah_transaksi: 12, total_penjualan: 540000, data: [] }
 *
 * /laporan/pendapatan:
 *   get:
 *     summary: Laporan pendapatan / laba-rugi
 *     tags: [Laporan]
 *     security: [{ basicAuth: [] }]
 *     parameters:
 *       - { in: query, name: tanggal_awal, required: true, schema: { type: string, format: date } }
 *       - { in: query, name: tanggal_akhir, required: true, schema: { type: string, format: date } }
 *       - { in: query, name: status, schema: { type: integer, enum: [0,1] } }
 *     responses:
 *       200:
 *         description: Omzet, modal, laba
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { omzet: 540000, modal: 420000, laba: 120000, jumlah_item: 30 }
 *
 * /laporan/stok:
 *   get:
 *     summary: Laporan stok produk + nilai stok
 *     tags: [Laporan]
 *     security: [{ basicAuth: [] }]
 *     responses: { 200: { description: Laporan stok } }
 *
 * /laporan/penyusutan:
 *   get:
 *     summary: Laporan penyusutan produk
 *     tags: [Laporan]
 *     security: [{ basicAuth: [] }]
 *     responses: { 200: { description: Laporan penyusutan } }
 */
router.get('/penjualan', validate(v.laporan.penjualan), ctrl.penjualan);
router.get('/pendapatan', validate(v.laporan.pendapatan), ctrl.pendapatan);
router.get('/stok', ctrl.stok);
router.get('/penyusutan', ctrl.penyusutan);

module.exports = router;
