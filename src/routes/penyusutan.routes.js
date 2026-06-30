const router = require('express').Router();
const ctrl = require('../controllers/penyusutanController');
const validate = require('../middlewares/validate');
const v = require('../validations');

/**
 * @swagger
 * tags:
 *   - name: Penyusutan
 *     description: Penyusutan / perubahan harga jual produk
 *
 * /penyusutan/produk/{id}:
 *   get:
 *     summary: Riwayat penyusutan suatu produk
 *     tags: [Penyusutan]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer }, description: ID produk }]
 *     responses: { 200: { description: List } }
 *   post:
 *     summary: Catat penyusutan harga jual produk
 *     tags: [Penyusutan]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer }, description: ID produk }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [harga_jual_akhir]
 *             properties:
 *               harga_jual_awal: { type: integer, example: 12000 }
 *               harga_jual_akhir: { type: integer, example: 10000 }
 *               prosentase: { type: integer, example: 16 }
 *     responses: { 201: { description: Dicatat, harga jual diperbarui } }
 *
 * /penyusutan/{id}:
 *   delete:
 *     summary: Hapus penyusutan (kembalikan harga jual awal)
 *     tags: [Penyusutan]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer }, description: ID penyusutan }]
 *     responses: { 200: { description: Dihapus } }
 */
router.get('/produk/:id', ctrl.listByProduk);
router.post('/produk/:id', validate(v.penyusutan.create), ctrl.create);
router.delete('/:id', ctrl.remove);

module.exports = router;
