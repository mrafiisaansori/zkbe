const router = require('express').Router();
const ctrl = require('../controllers/penjualanController');
const validate = require('../middlewares/validate');
const v = require('../validations');

/**
 * @swagger
 * tags:
 *   - name: Penjualan
 *     description: Transaksi penjualan (kasir) - checkout, detail, void
 *
 * /penjualan:
 *   get:
 *     summary: Daftar transaksi penjualan
 *     tags: [Penjualan]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: tanggal_awal, schema: { type: string, format: date } }
 *       - { in: query, name: tanggal_akhir, schema: { type: string, format: date } }
 *       - { in: query, name: id_user, schema: { type: integer }, description: Filter kasir }
 *       - { in: query, name: status, schema: { type: integer, enum: [0,1] }, description: "1=sah, 0=batal" }
 *     responses: { 200: { description: List penjualan } }
 *
 * /penjualan/checkout:
 *   post:
 *     summary: Checkout / bayar (buat transaksi penjualan)
 *     description: Meniru Kasir::bayar(). Validasi stok, simpan header + detail + rekam stok, kurangi stok produk (atomik).
 *     tags: [Penjualan]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items, id_jenis_bayar, id_user]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id_produk: { type: integer, example: 7 }
 *                     qty: { type: number, example: 2 }
 *               id_jenis_bayar: { type: integer, example: 2 }
 *               id_user: { type: integer, example: 2 }
 *               bayar: { type: number, example: 50000 }
 *               diskon: { type: number, example: 0 }
 *               keterangan: { type: string }
 *     responses:
 *       201:
 *         description: Transaksi berhasil
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Transaksi penjualan berhasil
 *               data: { id: 25, no_nota: "TZK-000001", subtotal: 24000, diskon: 0, total: 24000, bayar: 50000, kembalian: 26000 }
 *       400: { description: Stok kurang / keranjang kosong / bayar kurang }
 *
 * /penjualan/{id}:
 *   get:
 *     summary: Detail transaksi penjualan (header + item)
 *     tags: [Penjualan]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Detail }, 404: { description: Tidak ditemukan } }
 *
 * /penjualan/{id}/void:
 *   post:
 *     summary: Batalkan transaksi (void) & kembalikan stok
 *     tags: [Penjualan]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Dibatalkan }, 400: { description: Sudah dibatalkan } }
 *
 * /penjualan/{id}/kirim-wa:
 *   post:
 *     summary: Kirim struk transaksi ke WhatsApp pelanggan (khusus plan PRO ke atas)
 *     description: Format struk sebagai teks WA (bold/monospace), dikirim lewat WA Gateway internal (wazapp.web.id).
 *     tags: [Penjualan]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nomor]
 *             properties:
 *               nomor: { type: string, example: "6281234567890", description: "Format 62xxxxxxxxxx" }
 *     responses:
 *       200: { description: Struk terkirim }
 *       400: { description: Nomor tidak valid }
 *       403: { description: Bukan plan PRO/BUSINESS }
 *       404: { description: Transaksi tidak ditemukan }
 *       502: { description: Gagal menghubungi WA Gateway }
 */
router.get('/', validate(v.penjualan.list), ctrl.list);
router.post('/checkout', validate(v.penjualan.checkout), ctrl.checkout);
router.get('/:id', ctrl.getById);
router.post('/:id/void', ctrl.void);
router.post('/:id/kirim-wa', validate(v.penjualan.kirimWA), ctrl.kirimWA);

module.exports = router;
