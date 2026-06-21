const catchAsync = require('../utils/catchAsync');
const { success } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const { withMerchantScope } = require('../utils/tenancy');
const { withFotoUrlList } = require('../utils/fileUrl');

const merchantService = require('../services/merchantService');
const dashboardService = require('../services/dashboardService');
const produkService = require('../services/produkService');
const kategoriService = require('../services/kategoriService');
const penjualanService = require('../services/penjualanService');
const penggunaService = require('../services/penggunaService');
const laporanService = require('../services/laporanService');
const qrisService = require('../services/qrisService');
const identitasService = require('../services/identitasService');

// Pastikan merchant ada, lalu jalankan service di dalam scope merchant tsb.
async function scoped(merchantId, fn) {
  const m = await merchantService.getById(merchantId); // 404 bila tak ada
  const data = await withMerchantScope(m.ID, fn);
  return { merchant: m, data };
}

module.exports = {
  // Ringkasan dashboard merchant (read-only).
  dashboard: catchAsync(async (req, res) => {
    const { merchant, data } = await scoped(req.params.id, () => dashboardService.summary());
    return success(res, { data: { merchant, summary: data } });
  }),

  // Daftar produk merchant (dengan FOTO_URL).
  produk: catchAsync(async (req, res) => {
    const { data } = await scoped(req.params.id, () => produkService.list({ search: req.query.search }));
    return success(res, { data: withFotoUrlList(data, req) });
  }),

  kategori: catchAsync(async (req, res) => {
    const { data } = await scoped(req.params.id, () => kategoriService.list());
    return success(res, { data });
  }),

  // Laporan stok (jumlah produk + nilai stok).
  stok: catchAsync(async (req, res) => {
    const { data } = await scoped(req.params.id, () => laporanService.stok());
    return success(res, { data });
  }),

  // Transaksi penjualan merchant.
  penjualan: catchAsync(async (req, res) => {
    const { data } = await scoped(req.params.id, () => penjualanService.list(req.query));
    return success(res, { data });
  }),

  // Laporan penjualan & pendapatan.
  laporanPenjualan: catchAsync(async (req, res) => {
    const { data } = await scoped(req.params.id, () => laporanService.penjualan(req.query));
    return success(res, { data });
  }),
  laporanPendapatan: catchAsync(async (req, res) => {
    const { data } = await scoped(req.params.id, () => laporanService.pendapatan(req.query));
    return success(res, { data });
  }),

  // Daftar pengguna (admin/kasir) merchant.
  pengguna: catchAsync(async (req, res) => {
    const { data } = await scoped(req.params.id, () => penggunaService.list());
    return success(res, { data });
  }),

  // Pengaturan QRIS & identitas merchant.
  qris: catchAsync(async (req, res) => {
    const { data } = await scoped(req.params.id, () => qrisService.get());
    return success(res, { data });
  }),
  identitas: catchAsync(async (req, res) => {
    const { data } = await scoped(req.params.id, () => identitasService.get());
    return success(res, { data });
  }),
};
