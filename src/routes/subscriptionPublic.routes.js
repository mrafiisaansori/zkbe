const router = require('express').Router();
const ctrl = require('../controllers/subscriptionController');
const validate = require('../middlewares/validate');
const v = require('../validations');

// Webhook publik Midtrans billing. Keamanan diverifikasi menggunakan signature
// dan SERVER_KEY billing, bukan JWT atau merchant_id dari request body.
router.post('/midtrans/notification', validate(v.payment.notification), ctrl.notification);

module.exports = router;
