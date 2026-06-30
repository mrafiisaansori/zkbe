const router = require('express').Router();
const ctrl = require('../controllers/qrisController');
const validate = require('../middlewares/validate');
const { uploadQrisImage } = require('../middlewares/upload');
const tenantContext = require('../middlewares/tenantContext');
const v = require('../validations');
const { forbidGudang } = require('../middlewares/role');

// Pengaturan QRIS = bagian Pengaturan pembayaran, bukan akses Gudang.
router.use(forbidGudang);

/**
 * @swagger
 * tags:
 *   - name: QRIS
 *     description: Pengaturan pembayaran QRIS statis (Pengaturan > Pembayaran)
 *
 * /qris:
 *   get:
 *     summary: Ambil pengaturan QRIS
 *     tags: [QRIS]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: { ID: 1, MERCHANT_NAME: "TOKO ZONA KASIR", NMID: "ID1024xxxx", IMAGE: "uploads/qris/qris-123.png", IMAGE_URL: "http://localhost:3000/uploads/qris/qris-123.png", IS_ACTIVE: true }
 *   put:
 *     summary: Ubah pengaturan QRIS (upload gambar opsional)
 *     description: Kirim sebagai multipart/form-data bila menyertakan gambar (field `image`, jpg/jpeg/png/webp, maks 2MB).
 *     tags: [QRIS]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               merchant_name: { type: string }
 *               nmid: { type: string }
 *               is_active: { type: boolean }
 *               image: { type: string, format: binary, description: "Gambar QRIS (jpg/jpeg/png/webp, maks 2MB)" }
 *     responses:
 *       200: { description: Diperbarui }
 *       422: { description: Validasi gagal / format file salah / ukuran > 2MB }
 */
router.get('/', ctrl.get);
// tenantContext setelah multer agar konteks merchant tidak hilang (lihat produk.routes).
router.put('/', uploadQrisImage('image'), tenantContext, validate(v.qris.update), ctrl.update);

module.exports = router;
