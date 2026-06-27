const svc = require('../services/laporanService');
const catchAsync = require('../utils/catchAsync');
const { success } = require('../utils/response');

module.exports = {
  penjualan: catchAsync(async (req, res) => success(res, { data: await svc.penjualan(req.query) })),
  pendapatan: catchAsync(async (req, res) => success(res, { data: await svc.pendapatan(req.query) })),
  stok: catchAsync(async (req, res) => success(res, { data: await svc.stok() })),
  penyusutan: catchAsync(async (req, res) => success(res, { data: await svc.penyusutan() })),

  // Rekap lengkap (PRO/BUSINESS). Validasi plan ada di service.
  rekap: catchAsync(async (req, res) => success(res, { data: await svc.rekap(req.query) })),

  // Export rekap PRO/BUSINESS ke CSV (download).
  rekapExport: catchAsync(async (req, res) => {
    const csv = await svc.rekapCsv(req.query);
    const fname = `rekap-laporan-${req.query.tanggal_awal || ''}_${req.query.tanggal_akhir || ''}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    return res.status(200).send(csv);
  }),
};
