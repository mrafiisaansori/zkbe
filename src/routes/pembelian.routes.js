const router = require('express').Router();
const ctrl = require('../controllers/pembelianController');
const validate = require('../middlewares/validate');
const v = require('../validations');

/**
 * @swagger
 * tags:
 *   - name: Pembelian
 *     description: Pembelian / restok barang dari supplier
 *
 * /pembelian:
 *   get:
 *     summary: Daftar pembelian
 *     tags: [Pembelian]
 *     security: [{ basicAuth: [] }]
 *     responses: { 200: { description: List } }
 *   post:
 *     summary: Buat header pembelian (status draft)
 *     tags: [Pembelian]
 *     security: [{ basicAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [no_nota, tanggal, id_user]
 *             properties:
 *               no_nota: { type: string, example: NOTA-001 }
 *               tanggal: { type: string, format: date, example: 2026-06-15 }
 *               id_user: { type: integer, example: 1 }
 *     responses: { 201: { description: Dibuat } }
 *
 * /pembelian/{id}:
 *   get:
 *     summary: Detail pembelian (+ item)
 *     tags: [Pembelian]
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Detail }, 404: { description: Tidak ditemukan } }
 *   put:
 *     summary: Ubah header pembelian (hanya jika belum selesai)
 *     tags: [Pembelian]
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody: { content: { application/json: { schema: { type: object } } } }
 *     responses: { 200: { description: Diperbarui } }
 *   delete:
 *     summary: Hapus pembelian (hanya jika belum selesai)
 *     tags: [Pembelian]
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Dihapus } }
 *
 * /pembelian/{id}/detail:
 *   post:
 *     summary: Tambah item ke pembelian
 *     tags: [Pembelian]
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id_produk, harga_beli, qty, id_supplier]
 *             properties:
 *               id_produk: { type: integer, example: 7 }
 *               harga_beli: { type: integer, example: 11000 }
 *               qty: { type: number, example: 20 }
 *               id_supplier: { type: integer, example: 4 }
 *     responses: { 201: { description: Item ditambahkan } }
 *
 * /pembelian/{id}/detail/{idDetail}:
 *   delete:
 *     summary: Hapus item pembelian
 *     tags: [Pembelian]
 *     security: [{ basicAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *       - { in: path, name: idDetail, required: true, schema: { type: integer } }
 *     responses: { 200: { description: Dihapus } }
 *
 * /pembelian/{id}/selesaikan:
 *   post:
 *     summary: Selesaikan pembelian (tambah stok & update harga beli)
 *     description: Meniru selesaikanPembelian(). Untuk tiap item, catat rekam stok (restok), tambah stok, update harga beli produk, set status selesai.
 *     tags: [Pembelian]
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Selesai, stok diperbarui }, 400: { description: Sudah selesai / tanpa item } }
 */
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', validate(v.pembelian.create), ctrl.create);
router.put('/:id', validate(v.pembelian.update), ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/detail', validate(v.pembelian.addDetail), ctrl.addDetail);
router.delete('/:id/detail/:idDetail', ctrl.removeDetail);
router.post('/:id/selesaikan', ctrl.selesaikan);

module.exports = router;
