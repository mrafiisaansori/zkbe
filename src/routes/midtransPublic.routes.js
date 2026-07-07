const router = require('express').Router();
const paymentCtrl = require('../controllers/paymentController');
const subscriptionCtrl = require('../controllers/subscriptionController');
const validate = require('../middlewares/validate');
const v = require('../validations');

// Endpoint gabungan untuk dashboard Midtrans bila satu merchant account dipakai
// untuk transaksi POS (ZK-*) dan billing upgrade plan (ZKB-*).
function notification(req, res, next) {
  const orderId = String(req.body?.order_id || '');
  if (orderId.startsWith('ZKB-')) return subscriptionCtrl.notification(req, res, next);
  return paymentCtrl.notification(req, res, next);
}

router.post('/notification', validate(v.payment.notification), notification);
router.get('/notification', (req, res) => res.json({
  success: true,
  message: 'Midtrans notification endpoint is public. Use POST for webhooks.',
}));

module.exports = router;
