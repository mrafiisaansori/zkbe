const router = require('express').Router();
const ctrl = require('../controllers/supplierController');
const validate = require('../middlewares/validate');
const v = require('../validations');
const { requireRole, ADMIN } = require('../middlewares/role');

// CRUD supplier hanya untuk Admin Merchant & Super Admin (bukan kasir).
router.use(requireRole(ADMIN));

/**
 * @swagger
 * tags:
 *   - name: Supplier
 *     description: CRUD Supplier
 */

/**
 * @swagger
 * /supplier:
 *   get:
 *     summary: Daftar Supplier
 *     tags: [Supplier]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List data }
 *   post:
 *     summary: Tambah Supplier
 *     tags: [Supplier]
 *     security: [{ bearerAuth: [] }]
 *     requestBody: { required: true, content: { application/json: { schema: { type: object } } } }
 *     responses:
 *       201: { description: Data dibuat }
 *       422: { description: Validasi gagal }
 * /supplier/{id}:
 *   get:
 *     summary: Detail Supplier
 *     tags: [Supplier]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Detail data }
 *       404: { description: Tidak ditemukan }
 *   put:
 *     summary: Ubah Supplier
 *     tags: [Supplier]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody: { content: { application/json: { schema: { type: object } } } }
 *     responses:
 *       200: { description: Data diperbarui }
 *   delete:
 *     summary: Hapus Supplier
 *     tags: [Supplier]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Data dihapus }
 */
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', validate(v.supplier.create), ctrl.create);
router.put('/:id', validate(v.supplier.update), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
