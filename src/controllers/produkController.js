const svc = require('../services/produkService');
const importSvc = require('../services/produkImportService');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { success, created } = require('../utils/response');
const { withFotoUrl, withFotoUrlList } = require('../utils/fileUrl');

// Gabungkan field teks + file gambar (jika ada) menjadi payload service.
// FOTO disimpan sebagai path relatif: uploads/products/<filename>.
function buildPayload(req) {
  const data = { ...req.body };
  if (req.file) data.foto = `uploads/products/${req.file.filename}`;
  return data;
}

module.exports = {
  list: catchAsync(async (req, res) => {
    const result = await svc.list(req.query);
    if (result && result.rows) {
      return success(res, { data: withFotoUrlList(result.rows, req), meta: result.meta });
    }
    return success(res, { data: withFotoUrlList(result, req) });
  }),

  getById: catchAsync(async (req, res) =>
    success(res, { data: withFotoUrl(await svc.getById(req.params.id), req) })),

  getByBarcode: catchAsync(async (req, res) =>
    success(res, { data: withFotoUrl(await svc.getByBarcode(req.params.barcode), req) })),

  create: catchAsync(async (req, res) =>
    created(res, withFotoUrl(await svc.create(buildPayload(req)), req), 'Produk berhasil ditambahkan')),

  update: catchAsync(async (req, res) =>
    success(res, { data: withFotoUrl(await svc.update(req.params.id, buildPayload(req)), req), message: 'Produk diperbarui' })),

  remove: catchAsync(async (req, res) => { await svc.remove(req.params.id); return success(res, { message: 'Produk dihapus' }); }),

  adjustStock: catchAsync(async (req, res) =>
    success(res, { data: withFotoUrl(await svc.adjustStock(req.params.id, req.body), req), message: 'Stok disesuaikan' })),

  stockHistory: catchAsync(async (req, res) => {
    const result = await svc.stockHistory(req.params.id, req.query);
    if (result && result.rows) return success(res, { data: result.rows, meta: result.meta });
    return success(res, { data: result });
  }),

  // Unduh template Excel import produk.
  importTemplate: catchAsync(async (req, res) => {
    const buffer = importSvc.buildTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="template-import-produk.xlsx"');
    return res.send(buffer);
  }),

  // Import produk dari Excel/CSV. ?dryRun=true untuk preview tanpa simpan.
  importProducts: catchAsync(async (req, res) => {
    if (!req.file) throw new ApiError(422, 'File tidak ditemukan. Unggah file .xlsx atau .csv.');
    const dryRun = String(req.query.dryRun) === 'true';
    const result = await importSvc.importProducts(req.file.buffer, { dryRun });
    return success(res, { data: result, message: dryRun ? 'Pratinjau import' : 'Import selesai' });
  }),
};
