const router = require('express').Router();
const ctrl = require('../controllers/produkController');
const validate = require('../middlewares/validate');
const v = require('../validations');
const { uploadProductImage, uploadImportFile } = require('../middlewares/upload');
const tenantContext = require('../middlewares/tenantContext');

/**
 * @swagger
 * tags:
 *   - name: Produk
 *     description: Master produk/barang & stok
 */

/**
 * @swagger
 * /produk:
 *   get:
 *     summary: Daftar produk
 *     tags: [Produk]
 *     security: [{ basicAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Cari berdasarkan nama produk
 *     responses:
 *       200:
 *         description: List produk
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: OK
 *               data:
 *                 - { ID: 7, NAMA: Hydro Coco, ID_KATEGORI: 4, STOK: 74, HARGA_BELI: 11500, HARGA_JUAL: 12000, BARCODE: "1", FOTO: "uploads/products/produk-123.jpg", FOTO_URL: "http://localhost:3000/uploads/products/produk-123.jpg", kategori: { ID: 4, DESKRIPSI: Minuman } }
 *   post:
 *     summary: Tambah produk (mendukung upload gambar)
 *     description: |
 *       Kirim sebagai **multipart/form-data** bila menyertakan gambar (field `foto`),
 *       atau application/json bila tanpa gambar.
 *       Format gambar: jpg, jpeg, png, webp. Maksimal 2MB.
 *       Response menyertakan `FOTO` (path relatif) dan `FOTO_URL` (URL absolut).
 *     tags: [Produk]
 *     security: [{ basicAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [nama, id_kategori, harga_beli, harga_jual]
 *             properties:
 *               nama: { type: string, example: Teh Botol }
 *               id_kategori: { type: integer, example: 4 }
 *               stok: { type: number, example: 50 }
 *               harga_beli: { type: integer, example: 3000 }
 *               harga_jual: { type: integer, example: 4000 }
 *               barcode: { type: string, example: "8990001" }
 *               foto: { type: string, format: binary, description: "Gambar produk (jpg/jpeg/png/webp, maks 2MB)" }
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nama, id_kategori, harga_beli, harga_jual]
 *             properties:
 *               nama: { type: string, example: Teh Botol }
 *               id_kategori: { type: integer, example: 4 }
 *               stok: { type: number, example: 50 }
 *               harga_beli: { type: integer, example: 3000 }
 *               harga_jual: { type: integer, example: 4000 }
 *               barcode: { type: string, example: "8990001" }
 *     responses:
 *       201:
 *         description: Produk dibuat
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Produk berhasil ditambahkan
 *               data: { ID: 18, NAMA: Teh Botol, ID_KATEGORI: 4, STOK: 50, HARGA_JUAL: 4000, FOTO: "uploads/products/produk-1700000000.jpg", FOTO_URL: "http://localhost:3000/uploads/products/produk-1700000000.jpg" }
 *       422:
 *         description: Validasi gagal / file terlalu besar / format tidak didukung
 *         content:
 *           application/json:
 *             examples:
 *               ukuran: { value: { success: false, message: "Ukuran file maksimal 2MB" } }
 *               format: { value: { success: false, message: "Format file tidak didukung. Gunakan jpg, jpeg, png, atau webp." } }
 *
 * /produk/{id}:
 *   get:
 *     summary: Detail produk
 *     tags: [Produk]
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Detail produk }
 *       404: { description: Tidak ditemukan }
 *   put:
 *     summary: Ubah produk (mendukung update gambar)
 *     description: Kirim multipart/form-data untuk mengganti gambar (field `foto`). Gambar lama akan dihapus otomatis.
 *     tags: [Produk]
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               nama: { type: string }
 *               id_kategori: { type: integer }
 *               harga_beli: { type: integer }
 *               harga_jual: { type: integer }
 *               barcode: { type: string }
 *               foto: { type: string, format: binary, description: "Gambar baru (opsional)" }
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nama: { type: string }
 *               id_kategori: { type: integer }
 *               harga_beli: { type: integer }
 *               harga_jual: { type: integer }
 *               barcode: { type: string }
 *     responses:
 *       200: { description: Produk diperbarui }
 *   delete:
 *     summary: Hapus produk
 *     tags: [Produk]
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Produk dihapus }
 *
 * /produk/barcode/{barcode}:
 *   get:
 *     summary: Cari produk berdasarkan barcode (untuk scan kasir)
 *     tags: [Produk]
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: path, name: barcode, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: Produk ditemukan }
 *       404: { description: Tidak ditemukan }
 *
 * /produk/{id}/stok:
 *   post:
 *     summary: Penyesuaian stok insidentil (tambah/kurang manual)
 *     tags: [Produk]
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [jenis, qty]
 *             properties:
 *               jenis: { type: integer, enum: [1,2], description: "1=tambah, 2=kurang" }
 *               qty: { type: number, example: 5 }
 *               keterangan: { type: string }
 *     responses:
 *       200: { description: Stok disesuaikan }
 *
 * /produk/{id}/stok-history:
 *   get:
 *     summary: Riwayat pergerakan stok produk
 *     tags: [Produk]
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Riwayat stok }
 */
router.get('/', ctrl.list);
// Import produk massal (Excel/CSV). tenantContext setelah multer (memory) agar scope merchant aktif.
router.get('/import/template', ctrl.importTemplate);
router.post('/import', uploadImportFile('file'), tenantContext, ctrl.importProducts);
router.get('/barcode/:barcode', ctrl.getByBarcode);
router.get('/:id/stok-history', ctrl.stockHistory);
router.get('/:id', ctrl.getById);
// upload gambar (multipart) dijalankan dulu agar field teks & file terbaca, baru divalidasi.
// tenantContext WAJIB setelah multer: multer memutus AsyncLocalStorage, jadi konteks
// tenant (merchant_id) dibangun ulang dari req.user sebelum masuk controller/service.
router.post('/', uploadProductImage('foto'), tenantContext, validate(v.produk.create), ctrl.create);
router.put('/:id', uploadProductImage('foto'), tenantContext, validate(v.produk.update), ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/stok', validate(v.produk.adjustStock), ctrl.adjustStock);

module.exports = router;
