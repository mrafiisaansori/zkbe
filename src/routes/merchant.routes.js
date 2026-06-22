const router = require('express').Router();
const ctrl = require('../controllers/merchantController');
const monitor = require('../controllers/merchantMonitorController');
const { requireSuperadmin } = require('../middlewares/role');
const validate = require('../middlewares/validate');
const v = require('../validations');

/**
 * @swagger
 * tags:
 *   - name: Merchant
 *     description: Manajemen merchant/toko (super admin) & profil toko sendiri
 *
 * /merchant/me:
 *   get:
 *     summary: Data toko milik user yang login (admin merchant / kasir)
 *     tags: [Merchant]
 *     responses: { 200: { description: OK } }
 *   put:
 *     summary: Ubah profil toko sendiri (admin merchant)
 *     tags: [Merchant]
 *     responses: { 200: { description: Diperbarui } }
 *
 * /merchant:
 *   get:
 *     summary: Daftar semua merchant (Super Admin)
 *     tags: [Merchant]
 *     responses: { 200: { description: List }, 403: { description: Khusus super admin } }
 *
 * /merchant/stats:
 *   get:
 *     summary: Statistik merchant (Super Admin)
 *     tags: [Merchant]
 *     responses: { 200: { description: OK } }
 *
 * /merchant/{id}/status:
 *   put:
 *     summary: Aktifkan / tangguhkan merchant (Super Admin)
 *     tags: [Merchant]
 *     responses: { 200: { description: Diperbarui } }
 */

// Profil toko sendiri (semua role bermerchant).
router.get('/me', ctrl.getOwn);
router.put('/me', ctrl.updateOwn);

// Khusus Super Admin.
router.get('/', requireSuperadmin, ctrl.list);
router.get('/stats', requireSuperadmin, ctrl.stats);

// Pemantauan detail per merchant (read-only) - Super Admin.
router.get('/:id/dashboard', requireSuperadmin, monitor.dashboard);
router.get('/:id/produk', requireSuperadmin, monitor.produk);
router.get('/:id/kategori', requireSuperadmin, monitor.kategori);
router.get('/:id/stok', requireSuperadmin, monitor.stok);
router.get('/:id/penjualan', requireSuperadmin, monitor.penjualan);
router.get('/:id/laporan/penjualan', requireSuperadmin, monitor.laporanPenjualan);
router.get('/:id/laporan/pendapatan', requireSuperadmin, monitor.laporanPendapatan);
router.get('/:id/pengguna', requireSuperadmin, monitor.pengguna);
router.get('/:id/qris', requireSuperadmin, monitor.qris);
router.get('/:id/identitas', requireSuperadmin, monitor.identitas);

router.get('/:id', requireSuperadmin, ctrl.getById);
router.put('/:id/status', requireSuperadmin, ctrl.updateStatus);

// Aktivasi/nonaktivasi PRO manual + riwayat (Super Admin).
router.put('/:id/plan', requireSuperadmin, validate(v.merchant.setPlan), ctrl.setPlan);
router.get('/:id/plan-history', requireSuperadmin, ctrl.planHistory);

module.exports = router;
