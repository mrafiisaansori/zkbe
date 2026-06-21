const router = require('express').Router();
const ctrl = require('../controllers/identitasController');
const validate = require('../middlewares/validate');
const v = require('../validations');
const { uploadBannerImage, uploadLogoImage } = require('../middlewares/upload');
const tenantContext = require('../middlewares/tenantContext');

/**
 * @swagger
 * tags:
 *   - name: Identitas
 *     description: Identitas toko
 *
 * /identitas:
 *   get:
 *     summary: Ambil identitas toko
 *     tags: [Identitas]
 *     security: [{ basicAuth: [] }]
 *     responses: { 200: { description: OK } }
 *   put:
 *     summary: Ubah identitas toko
 *     tags: [Identitas]
 *     security: [{ basicAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nama: { type: string }
 *               alamat: { type: string }
 *               no_telp: { type: string }
 *               email: { type: string }
 *               website: { type: string }
 *               logo: { type: string }
 *     responses: { 200: { description: Diperbarui } }
 */
router.get('/', ctrl.get);
router.put('/', validate(v.identitas.update), ctrl.update);
// Upload banner katalog & logo toko (multipart). tenantContext setelah multer agar scope aktif.
router.post('/banner', uploadBannerImage('banner'), tenantContext, ctrl.uploadBanner);
router.post('/logo', uploadLogoImage('logo'), tenantContext, ctrl.uploadLogo);

module.exports = router;
