const router = require('express').Router();
const ctrl = require('../controllers/midtransTestController');
const { requireSuperadmin } = require('../middlewares/role');

/**
 * @swagger
 * tags:
 *   - name: MidtransTest
 *     description: Alat internal Super Admin buat ngecek status channel pembayaran Midtrans (bukan fitur bisnis, tidak nyimpan data).
 */
router.post('/gopay-qris', requireSuperadmin, ctrl.chargeGopayQrisTest);

module.exports = router;
