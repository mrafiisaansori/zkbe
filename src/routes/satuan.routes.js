const router = require('express').Router();
const ctrl = require('../controllers/satuanController');
const validate = require('../middlewares/validate');
const v = require('../validations');

/**
 * @swagger
 * tags: [{ name: Satuan, description: Master satuan/UOM produk (Pcs, Box, Dus, dll) }]
 * /satuan:
 *   get: { summary: Daftar satuan, tags: [Satuan], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 *   post: { summary: Tambah satuan, tags: [Satuan], security: [{ bearerAuth: [] }], responses: { 201: { description: Dibuat } } }
 * /satuan/{id}:
 *   put: { summary: Ubah satuan, tags: [Satuan], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 *   delete: { summary: Hapus satuan, tags: [Satuan], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 */
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', validate(v.satuan.upsert), ctrl.create);
router.put('/:id', validate(v.satuan.upsert), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
