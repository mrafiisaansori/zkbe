const fs = require('fs');
const path = require('path');
const multer = require('multer');
const ApiError = require('../utils/ApiError');

const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

// Folder penyimpanan gambar produk.
const UPLOAD_DIR = path.join(__dirname, '../../uploads/products');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Folder penyimpanan gambar QRIS.
const QRIS_DIR = path.join(__dirname, '../../uploads/qris');
if (!fs.existsSync(QRIS_DIR)) fs.mkdirSync(QRIS_DIR, { recursive: true });

const BANNER_DIR = path.join(__dirname, '../../uploads/banner');
if (!fs.existsSync(BANNER_DIR)) fs.mkdirSync(BANNER_DIR, { recursive: true });
const LOGO_DIR = path.join(__dirname, '../../uploads/logo');
if (!fs.existsSync(LOGO_DIR)) fs.mkdirSync(LOGO_DIR, { recursive: true });

function fileFilter(req, file, cb) {
  if (ALLOWED.includes(file.mimetype)) return cb(null, true);
  cb(new ApiError(422, 'Format file tidak didukung. Gunakan jpg, jpeg, png, atau webp.'));
}

// Buat storage dengan folder tujuan & prefix nama file unik tertentu.
function makeStorage(dir, prefix) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const unique = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, unique);
    },
  });
}

const productUpload = multer({ storage: makeStorage(UPLOAD_DIR, 'produk'), fileFilter, limits: { fileSize: MAX_SIZE } });
const qrisUpload = multer({ storage: makeStorage(QRIS_DIR, 'qris'), fileFilter, limits: { fileSize: MAX_SIZE } });

// Import produk (Excel/CSV) -> memory storage agar bisa di-parse langsung.
const IMPORT_MIME = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv', 'application/csv', 'text/plain', 'application/octet-stream',
];
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const okExt = /\.(xlsx|xls|csv)$/i.test(file.originalname);
    if (IMPORT_MIME.includes(file.mimetype) || okExt) return cb(null, true);
    cb(new ApiError(422, 'Format tidak didukung. Gunakan .xlsx atau .csv'));
  },
});

// Wrapper agar error multer (ukuran/format) menjadi response JSON standar.
function wrapSingle(multerInstance, fieldName) {
  const handler = multerInstance.single(fieldName);
  return (req, res, next) =>
    handler(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') return next(new ApiError(422, 'Ukuran file maksimal 2MB'));
        return next(err instanceof ApiError ? err : new ApiError(400, err.message));
      }
      next();
    });
}

function uploadProductImage(fieldName = 'foto') {
  return wrapSingle(productUpload, fieldName);
}

function uploadQrisImage(fieldName = 'image') {
  return wrapSingle(qrisUpload, fieldName);
}

function uploadImportFile(fieldName = 'file') {
  return wrapSingle(importUpload, fieldName);
}

const bannerUpload = multer({ storage: makeStorage(BANNER_DIR, 'banner'), fileFilter, limits: { fileSize: MAX_SIZE } });
function uploadBannerImage(fieldName = 'banner') {
  return wrapSingle(bannerUpload, fieldName);
}

const logoUpload = multer({ storage: makeStorage(LOGO_DIR, 'logo'), fileFilter, limits: { fileSize: MAX_SIZE } });
function uploadLogoImage(fieldName = 'logo') {
  return wrapSingle(logoUpload, fieldName);
}

module.exports = {
  uploadProductImage, uploadQrisImage,
  uploadImportFile, uploadBannerImage, uploadLogoImage,
  UPLOAD_DIR, QRIS_DIR, BANNER_DIR, LOGO_DIR,
};
