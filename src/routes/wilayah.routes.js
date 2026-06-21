const router = require('express').Router();
const ctrl = require('../controllers/wilayahController');

/**
 * @swagger
 * tags:
 *   - name: Wilayah
 *     description: Referensi provinsi & kota/kabupaten (publik, untuk dropdown registrasi)
 *
 * /wilayah/provinsi:
 *   get:
 *     summary: Daftar provinsi
 *     tags: [Wilayah]
 *     responses: { 200: { description: OK } }
 *
 * /wilayah/kota:
 *   get:
 *     summary: Daftar kota/kabupaten per provinsi
 *     tags: [Wilayah]
 *     parameters:
 *       - { in: query, name: provinsi_id, required: true, schema: { type: string } }
 *     responses: { 200: { description: OK } }
 */
router.get('/provinsi', ctrl.provinsi);
router.get('/kota', ctrl.kota);

module.exports = router;
