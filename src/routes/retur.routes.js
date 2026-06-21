const router = require('express').Router();
const ctrl = require('../controllers/returController');
const validate = require('../middlewares/validate');
const v = require('../validations');

/**
 * @swagger
 * tags:
 *   - name: Retur
 *     description: Retur barang ke supplier (mengurangi stok)
 *
 * /retur:
 *   get:
 *     summary: Daftar retur
 *     tags: [Retur]
 *     security: [{ basicAuth: [] }]
 *     responses: { 200: { description: List } }
 *   post:
 *     summary: Buat header retur
 *     tags: [Retur]
 *     security: [{ basicAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [no_nota, tanggal, id_user]
 *             properties:
 *               no_nota: { type: string, example: RTR-001 }
 *               tanggal: { type: string, format: date }
 *               id_user: { type: integer, example: 1 }
 *     responses: { 201: { description: Dibuat } }
 *
 * /retur/{id}:
 *   get:
 *     summary: Detail retur (+ item)
 *     tags: [Retur]
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Detail }, 404: { description: Tidak ditemukan } }
 *   put:
 *     summary: Ubah header retur
 *     tags: [Retur]
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody: { content: { application/json: { schema: { type: object } } } }
 *     responses: { 200: { description: Diperbarui } }
 *   delete:
 *     summary: Hapus retur (+ detail)
 *     tags: [Retur]
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Dihapus } }
 *
 * /retur/{id}/detail:
 *   post:
 *     summary: Tambah item retur (kurangi stok, validasi stok cukup)
 *     tags: [Retur]
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id_produk, qty, id_supplier]
 *             properties:
 *               id_produk: { type: integer, example: 7 }
 *               qty: { type: number, example: 3 }
 *               id_supplier: { type: integer, example: 4 }
 *               keterangan: { type: string }
 *     responses: { 201: { description: Item ditambahkan }, 400: { description: Stok kurang } }
 *
 * /retur/{id}/detail/{idDetail}:
 *   delete:
 *     summary: Batalkan item retur (kembalikan stok)
 *     tags: [Retur]
 *     security: [{ basicAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *       - { in: path, name: idDetail, required: true, schema: { type: integer } }
 *     responses: { 200: { description: Dibatalkan } }
 */
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', validate(v.retur.create), ctrl.create);
router.put('/:id', validate(v.retur.update), ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/detail', validate(v.retur.addDetail), ctrl.addDetail);
router.delete('/:id/detail/:idDetail', ctrl.removeDetail);

module.exports = router;
