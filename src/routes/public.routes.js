const router = require('express').Router();
const ctrl = require('../controllers/publicController');
const validate = require('../middlewares/validate');
const v = require('../validations');

/**
 * Rute PUBLIK (tanpa JWT). merchant_id diturunkan dari token QR / slug di server.
 * @swagger
 * tags: [{ name: Public, description: QR Menu & Katalog publik (tanpa login) }]
 */
// QR Menu / self order
router.get('/menu/:token', ctrl.getMenu);
router.post('/menu/:token/order', validate(v.public.order), ctrl.createOrder);

// Katalog publik
router.get('/store/:slug', ctrl.getCatalog);

module.exports = router;
