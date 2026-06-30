const router = require('express').Router();
const ctrl = require('../controllers/mejaController');
const validate = require('../middlewares/validate');
const v = require('../validations');

/**
 * @swagger
 * tags: [{ name: Meja, description: Meja & QR Menu (PRO) }]
 * /meja:
 *   get: { summary: Daftar meja, tags: [Meja], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 *   post: { summary: Tambah meja (PRO), tags: [Meja], security: [{ bearerAuth: [] }], responses: { 201: { description: Dibuat }, 403: { description: Khusus PRO } } }
 * /meja/{id}:
 *   put: { summary: Ubah meja, tags: [Meja], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 *   delete: { summary: Hapus meja, tags: [Meja], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 */
router.get('/', ctrl.list);
router.post('/', validate(v.meja.create), ctrl.create);
router.put('/:id', validate(v.meja.update), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
