const router = require('express').Router();
const ctrl = require('../controllers/memberController');
const validate = require('../middlewares/validate');
const v = require('../validations');
const { requireProPlan } = require('../middlewares/plan');

/**
 * @swagger
 * tags: [{ name: Member, description: Master member/customer (khusus plan PRO) }]
 * /member:
 *   get: { summary: Daftar member, tags: [Member], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 *   post: { summary: Tambah member (juga dipakai Quick Create di halaman kasir), tags: [Member], security: [{ bearerAuth: [] }], responses: { 201: { description: Dibuat } } }
 * /member/{id}:
 *   get: { summary: Detail member, tags: [Member], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 *   put: { summary: Ubah member, tags: [Member], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 *   delete: { summary: Hapus member, tags: [Member], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 * /member/{id}/detail:
 *   get: { summary: Detail member + rekap transaksi, tags: [Member], security: [{ bearerAuth: [] }], responses: { 200: { description: OK } } }
 */
// Fitur Member khusus plan PRO - berlaku untuk SELURUH endpoint di bawah ini,
// bukan cuma "bikin member baru" (beda dari Voucher). Divalidasi di backend
// supaya tetap aman meski endpoint diakses langsung tanpa lewat menu.
router.use(requireProPlan);
router.get('/', ctrl.list);
router.get('/:id/detail', ctrl.getDetail);
router.get('/:id', ctrl.getById);
router.post('/', validate(v.member.create), ctrl.create);
router.put('/:id', validate(v.member.update), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
