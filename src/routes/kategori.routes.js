const router = require('express').Router();
const ctrl = require('../controllers/kategoriController');
const validate = require('../middlewares/validate');
const v = require('../validations');

/**
 * @swagger
 * tags:
 *   - name: Kategori
 *     description: CRUD Kategori
 */

/**
 * @swagger
 * /kategori:
 *   get:
 *     summary: Daftar Kategori
 *     tags: [Kategori]
 *     security: [{ basicAuth: [] }]
 *     responses:
 *       200: { description: List data }
 *   post:
 *     summary: Tambah Kategori
 *     tags: [Kategori]
 *     security: [{ basicAuth: [] }]
 *     requestBody: { required: true, content: { application/json: { schema: { type: object } } } }
 *     responses:
 *       201: { description: Data dibuat }
 *       422: { description: Validasi gagal }
 * /kategori/{id}:
 *   get:
 *     summary: Detail Kategori
 *     tags: [Kategori]
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Detail data }
 *       404: { description: Tidak ditemukan }
 *   put:
 *     summary: Ubah Kategori
 *     tags: [Kategori]
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody: { content: { application/json: { schema: { type: object } } } }
 *     responses:
 *       200: { description: Data diperbarui }
 *   delete:
 *     summary: Hapus Kategori
 *     tags: [Kategori]
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Data dihapus }
 */
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', validate(v.kategori.upsert), ctrl.create);
router.put('/:id', validate(v.kategori.upsert), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
