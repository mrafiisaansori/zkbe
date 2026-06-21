const router = require('express').Router();
const ctrl = require('../controllers/voucherController');
const validate = require('../middlewares/validate');
const v = require('../validations');

/**
 * @swagger
 * tags: [{ name: Voucher, description: Promo/voucher per merchant }]
 * /voucher:
 *   get: { summary: Daftar voucher, tags: [Voucher], security: [{ basicAuth: [] }], responses: { 200: { description: OK } } }
 *   post: { summary: Buat voucher, tags: [Voucher], security: [{ basicAuth: [] }], responses: { 201: { description: Dibuat } } }
 * /voucher/validate:
 *   get: { summary: Validasi & pratinjau diskon voucher, tags: [Voucher], security: [{ basicAuth: [] }], responses: { 200: { description: OK } } }
 * /voucher/{id}:
 *   put: { summary: Ubah voucher, tags: [Voucher], security: [{ basicAuth: [] }], responses: { 200: { description: OK } } }
 *   delete: { summary: Hapus voucher, tags: [Voucher], security: [{ basicAuth: [] }], responses: { 200: { description: OK } } }
 */
router.get('/', ctrl.list);
router.get('/validate', ctrl.validate);
router.post('/', validate(v.voucher.create), ctrl.create);
router.put('/:id', validate(v.voucher.update), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
