const sequelize = require('../config/database');

const Pengguna = require('./Pengguna');
const Kategori = require('./Kategori');
const Produk = require('./Produk');
const Supplier = require('./Supplier');
const JenisBayar = require('./JenisBayar');
const Identitas = require('./Identitas');
const Qris = require('./Qris');
const Penjualan = require('./Penjualan');
const DetailPenjualan = require('./DetailPenjualan');
const Pembelian = require('./Pembelian');
const DetailPembelian = require('./DetailPembelian');
const Retur = require('./Retur');
const DetailRetur = require('./DetailRetur');
const RekamStok = require('./RekamStok');
const Penyusutan = require('./Penyusutan');
const Transaksi = require('./Transaksi');
const OpenBill = require('./OpenBill');
const OpenBillDetail = require('./OpenBillDetail');
const OpenBillPayment = require('./OpenBillPayment');
const TaxSetting = require('./TaxSetting');
const Voucher = require('./Voucher');
const Meja = require('./Meja');
const ModifierGroup = require('./ModifierGroup');
const ModifierOption = require('./ModifierOption');
const ProdukModifier = require('./ProdukModifier');
const SubscriptionSetting = require('./SubscriptionSetting');
const SubscriptionPayment = require('./SubscriptionPayment');
const PaymentGatewaySetting = require('./PaymentGatewaySetting');
const PaymentLog = require('./PaymentLog');
const PaymentWebhookLog = require('./PaymentWebhookLog');
const Merchant = require('./Merchant');
const MerchantInvoiceCounter = require('./MerchantInvoiceCounter');
const RegistrationOtp = require('./RegistrationOtp');
const PasswordResetOtp = require('./PasswordResetOtp');
const EmailChangeOtp = require('./EmailChangeOtp');
const PlanHistory = require('./PlanHistory');
const Provinsi = require('./Provinsi');
const Kota = require('./Kota');
const KasShift = require('./KasShift');
const KasShiftDetail = require('./KasShiftDetail');
const KasMutasi = require('./KasMutasi');
const { scopeModel } = require('../utils/tenancy');

// ===== Associations (mengikuti relasi di view_* dari DB existing) =====
// Produk - Kategori
Produk.belongsTo(Kategori, { foreignKey: 'ID_KATEGORI', targetKey: 'ID', as: 'kategori' });
Kategori.hasMany(Produk, { foreignKey: 'ID_KATEGORI', sourceKey: 'ID', as: 'produk' });

// Penjualan - Pengguna (kasir) & JenisBayar
Penjualan.belongsTo(Pengguna, { foreignKey: 'ID_USER', targetKey: 'ID', as: 'kasir' });
Penjualan.belongsTo(JenisBayar, { foreignKey: 'ID_JENIS_BAYAR', targetKey: 'ID', as: 'jenisBayar' });
Penjualan.hasMany(DetailPenjualan, { foreignKey: 'ID_TRANSAKSI_PENJUALAN', sourceKey: 'ID', as: 'detail' });
DetailPenjualan.belongsTo(Penjualan, { foreignKey: 'ID_TRANSAKSI_PENJUALAN', targetKey: 'ID', as: 'penjualan' });
DetailPenjualan.belongsTo(Produk, { foreignKey: 'ID_PRODUK', targetKey: 'ID', as: 'produk' });

// Pembelian
Pembelian.belongsTo(Pengguna, { foreignKey: 'ID_USER', targetKey: 'ID', as: 'user' });
Pembelian.belongsTo(Supplier, { foreignKey: 'ID_SUPPLIER', targetKey: 'ID', as: 'supplier' });
Pembelian.hasMany(DetailPembelian, { foreignKey: 'ID_TRANSAKSI_PEMBELIAN', sourceKey: 'ID', as: 'detail' });
DetailPembelian.belongsTo(Pembelian, { foreignKey: 'ID_TRANSAKSI_PEMBELIAN', targetKey: 'ID', as: 'pembelian' });
DetailPembelian.belongsTo(Produk, { foreignKey: 'ID_PRODUK', targetKey: 'ID', as: 'produk' });
DetailPembelian.belongsTo(Supplier, { foreignKey: 'ID_SUPPLIER', targetKey: 'ID', as: 'supplier' });

// Retur
Retur.belongsTo(Pengguna, { foreignKey: 'ID_USER', targetKey: 'ID', as: 'user' });
Retur.belongsTo(Supplier, { foreignKey: 'ID_SUPPLIER', targetKey: 'ID', as: 'supplier' });
Retur.belongsTo(Pembelian, { foreignKey: 'ID_PEMBELIAN', targetKey: 'ID', as: 'pembelian' });
Retur.hasMany(DetailRetur, { foreignKey: 'ID_TRANSAKSI_RETUR', sourceKey: 'ID', as: 'detail' });
DetailRetur.belongsTo(Retur, { foreignKey: 'ID_TRANSAKSI_RETUR', targetKey: 'ID', as: 'retur' });
DetailRetur.belongsTo(Produk, { foreignKey: 'ID_PRODUK', targetKey: 'ID', as: 'produk' });
DetailRetur.belongsTo(Supplier, { foreignKey: 'ID_SUPPLIER', targetKey: 'ID', as: 'supplier' });

// RekamStok & Penyusutan
RekamStok.belongsTo(Produk, { foreignKey: 'ID_PRODUK', targetKey: 'ID', as: 'produk' });
Penyusutan.belongsTo(Produk, { foreignKey: 'ID_PRODUK', targetKey: 'ID', as: 'produk' });

// ===== Open Bill (pesanan terbuka / bayar di akhir) =====
OpenBill.hasMany(OpenBillDetail, { foreignKey: 'ID_OPEN_BILL', sourceKey: 'ID', as: 'detail' });
OpenBillDetail.belongsTo(OpenBill, { foreignKey: 'ID_OPEN_BILL', targetKey: 'ID', as: 'bill' });
OpenBillDetail.belongsTo(Produk, { foreignKey: 'ID_PRODUK', targetKey: 'ID', as: 'produk' });
OpenBill.belongsTo(Pengguna, { foreignKey: 'ID_USER', targetKey: 'ID', as: 'kasir' });
OpenBill.belongsTo(Penjualan, { foreignKey: 'ID_PENJUALAN', targetKey: 'ID', as: 'penjualan' });
OpenBill.hasMany(OpenBillPayment, { foreignKey: 'ID_OPEN_BILL', sourceKey: 'ID', as: 'payments' });
OpenBillPayment.belongsTo(OpenBill, { foreignKey: 'ID_OPEN_BILL', targetKey: 'ID', as: 'bill' });
OpenBillPayment.belongsTo(Penjualan, { foreignKey: 'ID_PENJUALAN', targetKey: 'ID', as: 'penjualan' });
OpenBillPayment.belongsTo(JenisBayar, { foreignKey: 'ID_JENIS_BAYAR', targetKey: 'ID', as: 'jenisBayar' });

// ===== Modifier / Varian =====
ModifierGroup.hasMany(ModifierOption, { foreignKey: 'ID_GROUP', sourceKey: 'ID', as: 'options' });
ModifierOption.belongsTo(ModifierGroup, { foreignKey: 'ID_GROUP', targetKey: 'ID', as: 'group' });
ProdukModifier.belongsTo(ModifierGroup, { foreignKey: 'ID_GROUP', targetKey: 'ID', as: 'group' });

// ===== Subscription / Billing =====
SubscriptionPayment.belongsTo(Merchant, { foreignKey: 'MERCHANT_ID', targetKey: 'ID', as: 'merchant' });
SubscriptionPayment.belongsTo(Pengguna, { foreignKey: 'ID_USER', targetKey: 'ID', as: 'pemohon' });

// ===== Payment Gateway (Midtrans) =====
PaymentLog.belongsTo(Penjualan, { foreignKey: 'ID_PENJUALAN', targetKey: 'ID', as: 'penjualan' });

// ===== Multi-tenant: relasi ke Merchant =====
Merchant.hasMany(Pengguna, { foreignKey: 'MERCHANT_ID', sourceKey: 'ID', as: 'pengguna' });
Pengguna.belongsTo(Merchant, { foreignKey: 'MERCHANT_ID', targetKey: 'ID', as: 'merchant' });
Merchant.hasMany(Penjualan, { foreignKey: 'MERCHANT_ID', sourceKey: 'ID', as: 'penjualan' });
Penjualan.belongsTo(Merchant, { foreignKey: 'MERCHANT_ID', targetKey: 'ID', as: 'merchant' });
Merchant.hasOne(MerchantInvoiceCounter, { foreignKey: 'MERCHANT_ID', sourceKey: 'ID', as: 'invoiceCounter' });
MerchantInvoiceCounter.belongsTo(Merchant, { foreignKey: 'MERCHANT_ID', targetKey: 'ID', as: 'merchant' });

// ===== Closing / Sesi Kas (Shift) =====
KasShift.belongsTo(Pengguna, { foreignKey: 'ID_USER', targetKey: 'ID', as: 'kasir' });
KasShift.hasMany(KasShiftDetail, { foreignKey: 'ID_SHIFT', sourceKey: 'ID', as: 'detail' });
KasShift.hasMany(KasMutasi, { foreignKey: 'ID_SHIFT', sourceKey: 'ID', as: 'mutasi' });
KasShiftDetail.belongsTo(KasShift, { foreignKey: 'ID_SHIFT', targetKey: 'ID', as: 'shift' });
KasShiftDetail.belongsTo(JenisBayar, { foreignKey: 'ID_JENIS_BAYAR', targetKey: 'ID', as: 'jenisBayar' });
KasMutasi.belongsTo(KasShift, { foreignKey: 'ID_SHIFT', targetKey: 'ID', as: 'shift' });
Penjualan.belongsTo(KasShift, { foreignKey: 'ID_SHIFT', targetKey: 'ID', as: 'shift' });
KasShift.hasMany(Penjualan, { foreignKey: 'ID_SHIFT', sourceKey: 'ID', as: 'penjualan' });

// ===== Tenant scoping otomatis =====
// Setiap model di bawah ini WAJIB ter-filter berdasarkan merchant_id (dari JWT),
// kecuali super admin. Hook ini berlaku untuk find/count/create/update/destroy.
[
  Pengguna, Kategori, Produk, Supplier, JenisBayar, Identitas, Qris,
  Penjualan, DetailPenjualan, Pembelian, DetailPembelian,
  Retur, DetailRetur, RekamStok, Penyusutan, Transaksi,
  OpenBill, OpenBillDetail, OpenBillPayment,
  TaxSetting, Voucher, SubscriptionPayment, Meja,
  ModifierGroup, ModifierOption, ProdukModifier,
  PaymentGatewaySetting, PaymentLog,
  MerchantInvoiceCounter,
  KasShift, KasShiftDetail, KasMutasi,
].forEach((m) => scopeModel(m));
// Catatan: Merchant, RegistrationOtp, SubscriptionSetting TIDAK di-scope
// (dikelola super admin / global / alur publik).
// PaymentWebhookLog TIDAK di-scope: webhook Midtrans publik tanpa konteks tenant;
// MERCHANT_ID diisi eksplisit dari hasil parse order_id setelah signature valid.

module.exports = {
  sequelize,
  Pengguna, Kategori, Produk, Supplier, JenisBayar, Identitas, Qris,
  Penjualan, DetailPenjualan, Pembelian, DetailPembelian,
  Retur, DetailRetur, RekamStok, Penyusutan, Transaksi,
  OpenBill, OpenBillDetail, OpenBillPayment,
  TaxSetting, Voucher, SubscriptionSetting, SubscriptionPayment, Meja,
  ModifierGroup, ModifierOption, ProdukModifier,
  PaymentGatewaySetting, PaymentLog, PaymentWebhookLog,
  Merchant, MerchantInvoiceCounter, RegistrationOtp, PasswordResetOtp, EmailChangeOtp, PlanHistory, Provinsi, Kota,
  KasShift, KasShiftDetail, KasMutasi,
};
