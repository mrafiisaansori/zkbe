const router = require('express').Router();
const ctrl = require('../controllers/taxController');
const validate = require('../middlewares/validate');
const v = require('../validations');
const { requireProPlan } = require('../middlewares/plan');
const { forbidGudang } = require('../middlewares/role');

/**
 * @swagger
 * tags: [{ name: Tax, description: Pengaturan PPN & service charge per merchant }]
 * /tax:
 *   get: { summary: Ambil pengaturan pajak, tags: [Tax], security: [{ basicAuth: [] }], responses: { 200: { description: OK } } }
 *   put: { summary: Ubah pengaturan pajak, tags: [Tax], security: [{ basicAuth: [] }], responses: { 200: { description: Diperbarui } } }
 */
router.use(forbidGudang); // Pengaturan pajak bukan akses Gudang.
router.use(requireProPlan);
router.get('/', ctrl.get);
router.put('/', validate(v.tax.update), ctrl.update);

module.exports = router;
