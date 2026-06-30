const router = require('express').Router();
const ctrl = require('../controllers/jenisBayarController');
const validate = require('../middlewares/validate');
const v = require('../validations');
const { forbidGudang } = require('../middlewares/role');

// Metode pembayaran = Pengaturan, bukan akses Gudang.
router.use(forbidGudang);

/**
 * @swagger
 * tags:
 *   - name: Jenis Bayar
 *     description: CRUD Jenis Bayar
 */

/**
 * @swagger
 * /jenis-bayar:
 *   get:
 *     summary: Daftar Jenis Bayar
 *     tags: [Jenis Bayar]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List data }
 *   post:
 *     summary: Tambah Jenis Bayar
 *     tags: [Jenis Bayar]
 *     security: [{ bearerAuth: [] }]
 *     requestBody: { required: true, content: { application/json: { schema: { type: object } } } }
 *     responses:
 *       201: { description: Data dibuat }
 *       422: { description: Validasi gagal }
 * /jenis-bayar/{id}:
 *   get:
 *     summary: Detail Jenis Bayar
 *     tags: [Jenis Bayar]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Detail data }
 *       404: { description: Tidak ditemukan }
 *   put:
 *     summary: Ubah Jenis Bayar
 *     tags: [Jenis Bayar]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody: { content: { application/json: { schema: { type: object } } } }
 *     responses:
 *       200: { description: Data diperbarui }
 *   delete:
 *     summary: Hapus Jenis Bayar
 *     tags: [Jenis Bayar]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Data dihapus }
 */
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', validate(v.jenisBayar.upsert), ctrl.create);
router.put('/:id', validate(v.jenisBayar.upsert), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
