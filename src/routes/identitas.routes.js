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
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 *   put:
 *     summary: Ubah identitas toko
 *     tags: [Identitas]
 *     security: [{ bearerAuth: [] }]
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
// GET identitas dibutuhkan lintas halaman (header nota pembelian/retur) termasuk
// oleh role Gudang, jadi tetap diizinkan. Perubahan (PUT/upload) khusus Admin.
const { forbidGudang } = require('../middlewares/role');
router.get('/', ctrl.get);
router.put('/', forbidGudang, validate(v.identitas.update), ctrl.update);
// Upload banner katalog & logo toko (multipart). tenantContext setelah multer agar scope aktif.
router.post('/banner', forbidGudang, uploadBannerImage('banner'), tenantContext, ctrl.uploadBanner);
router.post('/logo', forbidGudang, uploadLogoImage('logo'), tenantContext, ctrl.uploadLogo);

module.exports = router;
