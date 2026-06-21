const router = require('express').Router();
const ctrl = require('../controllers/penggunaController');
const validate = require('../middlewares/validate');
const v = require('../validations');

/**
 * @swagger
 * tags:
 *   - name: Pengguna
 *     description: Manajemen user (admin & kasir). LEVEL 1=admin, 2=kasir.
 *
 * /pengguna:
 *   get:
 *     summary: Daftar pengguna
 *     tags: [Pengguna]
 *     security: [{ basicAuth: [] }]
 *     responses: { 200: { description: List pengguna } }
 *   post:
 *     summary: Tambah pengguna
 *     tags: [Pengguna]
 *     security: [{ basicAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nama, username, password, level]
 *             properties:
 *               nama: { type: string, example: Kasir Dua }
 *               username: { type: string, example: kasir2 }
 *               password: { type: string, example: rahasia }
 *               level: { type: integer, enum: [1,2], example: 2 }
 *               telp: { type: string }
 *     responses: { 201: { description: Dibuat }, 409: { description: Username sudah ada } }
 *
 * /pengguna/{id}:
 *   get:
 *     summary: Detail pengguna
 *     tags: [Pengguna]
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: OK }, 404: { description: Tidak ditemukan } }
 *   put:
 *     summary: Ubah pengguna
 *     tags: [Pengguna]
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody: { content: { application/json: { schema: { type: object } } } }
 *     responses: { 200: { description: Diperbarui } }
 *   delete:
 *     summary: Hapus pengguna
 *     tags: [Pengguna]
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Dihapus } }
 *
 * /pengguna/{id}/reset-password:
 *   post:
 *     summary: Reset password ke default (rahasia)
 *     tags: [Pengguna]
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Password direset } }
 *
 * /pengguna/{id}/change-password:
 *   post:
 *     summary: Ubah password (butuh password lama)
 *     tags: [Pengguna]
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [old_password, new_password]
 *             properties:
 *               old_password: { type: string }
 *               new_password: { type: string }
 *     responses: { 200: { description: Password diubah }, 400: { description: Password lama salah } }
 */
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', validate(v.pengguna.create), ctrl.create);
router.put('/:id', validate(v.pengguna.update), ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/reset-password', ctrl.resetPassword);
router.post('/:id/change-password', validate(v.pengguna.changePassword), ctrl.changePassword);

module.exports = router;
