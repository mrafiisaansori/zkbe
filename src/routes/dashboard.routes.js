const router = require('express').Router();
const ctrl = require('../controllers/dashboardController');
const validate = require('../middlewares/validate');
const v = require('../validations');

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
 *     security: [{ basicAuth: [] }]
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
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: query, name: tahun, required: true, schema: { type: integer, example: 2026 } }]
 *     responses: { 200: { description: Data 12 bulan } }
 */
router.get('/summary', ctrl.summary);
router.get('/chart', validate(v.dashboard.chart), ctrl.chart);

module.exports = router;
