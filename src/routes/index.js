const router = require('express').Router();
const authController = require('../controllers/authController');

// /auth/login, /register, /verify-otp, /resend-otp dilayani publik di app.js.
// Endpoint terproteksi (butuh JWT):
router.get('/auth/me', authController.me);
router.use('/account', require('./account.routes'));
router.use('/merchant', require('./merchant.routes'));
router.use('/produk', require('./produk.routes'));
router.use('/kategori', require('./kategori.routes'));
router.use('/supplier', require('./supplier.routes'));
router.use('/jenis-bayar', require('./jenisBayar.routes'));
router.use('/identitas', require('./identitas.routes'));
router.use('/qris', require('./qris.routes'));
router.use('/pengguna', require('./pengguna.routes'));
router.use('/penjualan', require('./penjualan.routes'));
router.use('/open-bill', require('./openBill.routes'));
router.use('/kas-shift', require('./kasShift.routes'));
router.use('/tax', require('./tax.routes'));
router.use('/voucher', require('./voucher.routes'));
router.use('/subscription', require('./subscription.routes'));
router.use('/payments', require('./payments.routes'));
router.use('/meja', require('./meja.routes'));
router.use('/modifier', require('./modifier.routes'));
router.use('/pembelian', require('./pembelian.routes'));
router.use('/retur', require('./retur.routes'));
router.use('/penyusutan', require('./penyusutan.routes'));
router.use('/transaksi-keuangan', require('./transaksi.routes'));
router.use('/laporan', require('./laporan.routes'));
router.use('/dashboard', require('./dashboard.routes'));

router.get('/', (req, res) => res.json({
  success: true,
  message: 'POS Backend API - migrasi dari CodeIgniter 3',
  docs: '/api-docs',
}));

module.exports = router;
