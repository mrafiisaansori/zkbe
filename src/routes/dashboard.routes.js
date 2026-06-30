const router = require('express').Router();
const ctrl = require('../controllers/dashboardController');
const validate = require('../middlewares/validate');
const v = require('../validations');
const { forbidGudang } = require('../middlewares/role');

/**
 * @swagger
 * tags:
 *   - name: Dashboard
 *     description: Ringkasan & grafik
 *
 * /dashboard/summary:
 *   get:
 *     summary: Ringkasan dashboard (penjualan hari ini, jumlah produk/user, stok menipis)
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Ringkasan
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { tanggal: 2026-06-15, transaksi_hari_ini: 5, pendapatan_hari_ini: 250000, total_produk: 9, total_pengguna: 2, stok_menipis: [] }
 *
 * /dashboard/chart:
 *   get:
 *     summary: Grafik laba & omzet bulanan per tahun
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: query, name: tahun, required: true, schema: { type: integer, example: 2026 } }]
 *     responses: { 200: { description: Data 12 bulan } }
 */
// Dashboard keuangan (summary & chart) DILARANG untuk role Gudang.
router.get('/summary', forbidGudang, ctrl.summary);
router.get('/chart', forbidGudang, validate(v.dashboard.chart), ctrl.chart);
// Dashboard operasional Gudang (stok & operasional, tanpa keuangan).
router.get('/gudang', ctrl.gudang);

module.exports = router;
