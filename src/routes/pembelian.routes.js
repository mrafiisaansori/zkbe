const router = require('express').Router();
const ctrl = require('../controllers/pembelianController');
const validate = require('../middlewares/validate');
const v = require('../validations');
const { requireRole, ADMIN } = require('../middlewares/role');

/**
 * @swagger
 * tags:
 *   - name: Pembelian
 *     description: Pembelian / restok barang dari supplier (Admin Merchant / Super Admin)
 */

// Modul inventori — hanya Admin Merchant & Super Admin (bukan kasir).
router.use(requireRole(ADMIN));

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', validate(v.pembelian.create), ctrl.create);
router.put('/:id', validate(v.pembelian.update), ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/selesaikan', ctrl.selesaikan);
router.post('/:id/batal', ctrl.cancel);

module.exports = router;
