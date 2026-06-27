const router = require('express').Router();
const ctrl = require('../controllers/kasShiftController');
const validate = require('../middlewares/validate');
const v = require('../validations');

/**
 * @swagger
 * tags:
 *   - name: KasShift
 *     description: Closing kasir / sesi kas (shift). Mendukung multi-kasir bersamaan. Ter-scope merchant.
 *
 * /kas-shift/active:
 *   get:
 *     summary: Sesi kas yang sedang terbuka milik kasir yang login (null bila tidak ada)
 *     tags: [KasShift]
 *     security: [{ basicAuth: [] }]
 *     responses: { 200: { description: Sesi aktif } }
 *
 * /kas-shift:
 *   get:
 *     summary: Daftar sesi kas (filter status/kasir/tanggal)
 *     tags: [KasShift]
 *     security: [{ basicAuth: [] }]
 *     parameters:
 *       - { in: query, name: status, schema: { type: string, enum: [OPEN, CLOSED] } }
 *       - { in: query, name: id_user, schema: { type: integer } }
 *       - { in: query, name: tanggal_awal, schema: { type: string, format: date } }
 *       - { in: query, name: tanggal_akhir, schema: { type: string, format: date } }
 *     responses: { 200: { description: List sesi kas } }
 *   post:
 *     summary: Buka sesi kas (input modal awal). Ditolak bila kasir masih punya sesi OPEN.
 *     tags: [KasShift]
 *     security: [{ basicAuth: [] }]
 *     responses: { 201: { description: Sesi dibuka } }
 *
 * /kas-shift/report/daily:
 *   get:
 *     summary: Laporan harian gabungan seluruh shift pada satu tanggal
 *     tags: [KasShift]
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: query, name: tanggal, required: true, schema: { type: string, format: date } }]
 *     responses: { 200: { description: Rekap harian } }
 *
 * /kas-shift/{id}:
 *   get:
 *     summary: Detail sesi kas (+ preview expected real-time bila masih OPEN)
 *     tags: [KasShift]
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Detail } }
 *
 * /kas-shift/{id}/mutasi:
 *   post:
 *     summary: Catat kas masuk/keluar laci (TIPE IN/OUT) selama sesi OPEN
 *     tags: [KasShift]
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 201: { description: Mutasi dicatat } }
 *
 * /kas-shift/{id}/close-preview:
 *   get:
 *     summary: Pratinjau perhitungan expected sebelum hitung uang fisik (tidak menyimpan)
 *     tags: [KasShift]
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Expected per metode bayar } }
 *
 * /kas-shift/{id}/close:
 *   post:
 *     summary: Tutup sesi kas - simpan actual cash & selisih
 *     tags: [KasShift]
 *     security: [{ basicAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Sesi ditutup } }
 */
router.get('/active', ctrl.active);
router.get('/report/daily', validate(v.kasShift.reportDaily), ctrl.reportDaily);
router.get('/', validate(v.kasShift.list), ctrl.list);
router.post('/', validate(v.kasShift.open), ctrl.open);
router.get('/:id', ctrl.getById);
router.post('/:id/mutasi', validate(v.kasShift.mutasi), ctrl.mutasi);
router.get('/:id/close-preview', ctrl.closePreview);
router.post('/:id/close', validate(v.kasShift.close), ctrl.close);

module.exports = router;
