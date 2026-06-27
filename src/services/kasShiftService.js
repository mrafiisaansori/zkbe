const { Op } = require('sequelize');
const {
  sequelize, KasShift, KasShiftDetail, KasMutasi,
  Penjualan, JenisBayar, Pengguna,
} = require('../models');
const ApiError = require('../utils/ApiError');

// ---------------------------------------------------------------------
// Util: deteksi metode bayar tunai dari namanya (Cash / Tunai).
// Dipakai untuk menentukan metode mana yang dicocokkan fisik.
// ---------------------------------------------------------------------
function isCashName(nama) {
  return /cash|tunai/i.test(String(nama || ''));
}

// Ubah nilai tanggal (string 'YYYY-MM-DD' ATAU objek Date hasil koersi Joi)
// menjadi batas awal/akhir hari berupa STRING literal. Penting: dengan string
// literal, Sequelize tidak melakukan konversi timezone pada batas filter,
// sehingga pencocokan ke kolom DATETIME konsisten (menghindari Invalid Date).
function dayBounds(value) {
  let ymd;
  if (value instanceof Date) {
    // Joi.date().iso() mem-parse 'YYYY-MM-DD' sebagai tengah malam UTC.
    ymd = `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
  } else {
    ymd = String(value).slice(0, 10);
  }
  return { ymd, start: `${ymd} 00:00:00`, end: `${ymd} 23:59:59` };
}

// Sesi aktif (OPEN) milik 1 kasir. Aturan: 1 kasir = 1 shift aktif.
async function getActive(idUser) {
  return KasShift.findOne({ where: { ID_USER: idUser, STATUS: 1 } });
}

// Versi untuk ditampilkan ke kasir: shift aktif + hitungan real-time (preview).
// Halaman Closing membaca field `preview` untuk semua angka ringkasan.
async function getActiveView(idUser) {
  const shift = await getActive(idUser);
  if (!shift) return null;
  const plain = shift.toJSON();
  plain.preview = await computeExpected(shift);
  return plain;
}

// Buka shift. Tolak jika kasir masih punya shift OPEN.
async function open({ id_user, modal_awal = 0, station, catatan }) {
  const existing = await getActive(id_user);
  if (existing) {
    throw new ApiError(400, `Masih ada sesi kas terbuka (#${existing.ID}). Tutup dulu sebelum membuka sesi baru.`);
  }
  const shift = await KasShift.create({
    ID_USER: id_user,
    STATION: station || null,
    MODAL_AWAL: Number(modal_awal) || 0,
    BUKA_AT: new Date(),
    STATUS: 1,
    CATATAN_BUKA: catatan || null,
  });
  return shift;
}

// Catat kas masuk/keluar (hanya saat shift OPEN).
async function addMutasi(idShift, { tipe, nominal, keterangan, id_user }) {
  const shift = await KasShift.findByPk(idShift);
  if (!shift) throw new ApiError(404, 'Sesi kas tidak ditemukan');
  if (shift.STATUS !== 1) throw new ApiError(400, 'Sesi kas sudah ditutup');
  const t = String(tipe).toUpperCase();
  if (!['IN', 'OUT'].includes(t)) throw new ApiError(400, 'TIPE harus IN atau OUT');
  if (!(Number(nominal) > 0)) throw new ApiError(400, 'Nominal harus lebih dari 0');
  return KasMutasi.create({
    ID_SHIFT: idShift,
    TIPE: t,
    NOMINAL: Number(nominal),
    KETERANGAN: keterangan || null,
    ID_USER: id_user,
    CREATED_AT: new Date(),
  });
}

// ---------------------------------------------------------------------
// Hitung "expected": rekap penjualan SAH (STATUS=1) pada shift, per metode bayar,
// + total mutasi kas IN/OUT. Tidak menyimpan apa pun (read-only).
// Hanya transaksi non-void & sudah dibayar (LUNAS/PAID) yang dihitung sebagai kas.
// ---------------------------------------------------------------------
async function computeExpected(shift) {
  // Penjualan sah pada shift ini. Kecualikan yang masih PENDING (gateway belum lunas).
  const rows = await Penjualan.findAll({
    where: {
      ID_SHIFT: shift.ID,
      STATUS: 1,
      [Op.or]: [
        { PAYMENT_STATUS: null },          // pembayaran manual (cash/transfer/QRIS statis)
        { PAYMENT_STATUS: 'PAID' },         // gateway sudah settle
      ],
    },
    include: [{ model: JenisBayar, as: 'jenisBayar', attributes: ['ID', 'NAMA'] }],
  });

  // Agregasi per metode bayar.
  const byMethod = new Map(); // id_jenis -> { id, nama, is_cash, expected }
  for (const r of rows) {
    const id = r.ID_JENIS_BAYAR;
    const nama = r.jenisBayar ? r.jenisBayar.NAMA : '(tidak diketahui)';
    const total = Number(r.TOTAL) || 0;
    if (!byMethod.has(id)) {
      byMethod.set(id, { id_jenis_bayar: id, nama, is_cash: isCashName(nama), expected: 0 });
    }
    byMethod.get(id).expected += total;
  }

  // Mutasi kas (mempengaruhi expected cash saja).
  const mutasi = await KasMutasi.findAll({ where: { ID_SHIFT: shift.ID } });
  let mutasiIn = 0; let mutasiOut = 0;
  for (const m of mutasi) {
    if (m.TIPE === 'IN') mutasiIn += Number(m.NOMINAL) || 0;
    else mutasiOut += Number(m.NOMINAL) || 0;
  }

  const methods = Array.from(byMethod.values());
  const cashSales = methods.filter((m) => m.is_cash).reduce((a, b) => a + b.expected, 0);
  const nonCashSales = methods.filter((m) => !m.is_cash).reduce((a, b) => a + b.expected, 0);

  // Expected cash di laci = modal awal + penjualan tunai + mutasi masuk - mutasi keluar.
  const modal = Number(shift.MODAL_AWAL) || 0;
  const expectedCash = modal + cashSales + mutasiIn - mutasiOut;

  return {
    modal_awal: modal,
    methods,                 // rincian per metode bayar (expected)
    cash_sales: cashSales,
    non_cash_sales: nonCashSales,
    total_sales: cashSales + nonCashSales,
    mutasi_in: mutasiIn,
    mutasi_out: mutasiOut,
    expected_cash: expectedCash,
    jumlah_transaksi: rows.length,
  };
}

// Preview sebelum kasir menghitung uang fisik (tidak menyimpan).
async function closePreview(idShift) {
  const shift = await KasShift.findByPk(idShift);
  if (!shift) throw new ApiError(404, 'Sesi kas tidak ditemukan');
  if (shift.STATUS !== 1) throw new ApiError(400, 'Sesi kas sudah ditutup');
  const calc = await computeExpected(shift);
  return { shift, ...calc };
}

// ---------------------------------------------------------------------
// Tutup shift: simpan expected vs actual + selisih.
// payload.actual_cash      : hasil hitung fisik laci.
// payload.actual_methods   : (opsional) [{ id_jenis_bayar, actual }] untuk non-cash.
// ---------------------------------------------------------------------
async function close(idShift, { actual_cash = 0, actual_methods = [], catatan } = {}) {
  return sequelize.transaction(async (trx) => {
    const shift = await KasShift.findByPk(idShift, { transaction: trx });
    if (!shift) throw new ApiError(404, 'Sesi kas tidak ditemukan');
    if (shift.STATUS !== 1) throw new ApiError(400, 'Sesi kas sudah ditutup');

    const calc = await computeExpected(shift);
    const actualMap = new Map((actual_methods || []).map((a) => [Number(a.id_jenis_bayar), Number(a.actual) || 0]));

    // Simpan rincian per metode bayar.
    for (const m of calc.methods) {
      const isCash = m.is_cash;
      const actual = isCash ? (Number(actual_cash) || 0)
        : (actualMap.has(m.id_jenis_bayar) ? actualMap.get(m.id_jenis_bayar) : m.expected);
      await KasShiftDetail.create({
        ID_SHIFT: shift.ID,
        ID_JENIS_BAYAR: m.id_jenis_bayar,
        NAMA_JENIS: m.nama,
        IS_CASH: isCash ? 1 : 0,
        EXPECTED: m.expected,
        ACTUAL: actual,
        SELISIH: actual - m.expected,
      }, { transaction: trx });
    }

    const actualCash = Number(actual_cash) || 0;
    const selisihCash = actualCash - calc.expected_cash;

    await shift.update({
      STATUS: 0,
      TUTUP_AT: new Date(),
      EXPECTED_CASH: calc.expected_cash,
      ACTUAL_CASH: actualCash,
      SELISIH_CASH: selisihCash,
      CATATAN_TUTUP: catatan || null,
    }, { transaction: trx });

    return getById(shift.ID, trx);
  });
}

async function getById(idShift, trx) {
  const shift = await KasShift.findByPk(idShift, {
    include: [
      { model: Pengguna, as: 'kasir', attributes: ['ID', 'NAMA'] },
      { model: KasShiftDetail, as: 'detail' },
      { model: KasMutasi, as: 'mutasi' },
    ],
    ...(trx ? { transaction: trx } : {}),
  });
  if (!shift) throw new ApiError(404, 'Sesi kas tidak ditemukan');
  // Untuk shift yang masih OPEN, sertakan hitungan expected real-time.
  const plain = shift.toJSON();
  if (shift.STATUS === 1) plain.preview = await computeExpected(shift);
  return plain;
}

async function list({ status, id_user, tanggal_awal, tanggal_akhir } = {}) {
  const where = {};
  if (status === 'OPEN') where.STATUS = 1;
  if (status === 'CLOSED') where.STATUS = 0;
  if (id_user) where.ID_USER = id_user;
  if (tanggal_awal || tanggal_akhir) {
    where.BUKA_AT = {};
    if (tanggal_awal) where.BUKA_AT[Op.gte] = dayBounds(tanggal_awal).start;
    if (tanggal_akhir) where.BUKA_AT[Op.lte] = dayBounds(tanggal_akhir).end;
  }
  return KasShift.findAll({
    where,
    include: [{ model: Pengguna, as: 'kasir', attributes: ['ID', 'NAMA'] }],
    order: [['BUKA_AT', 'DESC']],
  });
}

// ---------------------------------------------------------------------
// Laporan harian (gabungan): semua shift yang DIBUKA pada tanggal tsb,
// di-roll-up. Cocok untuk rekap & dashboard.
// ---------------------------------------------------------------------
async function reportDaily(tanggal) {
  if (!tanggal) throw new ApiError(400, 'Parameter tanggal wajib diisi (YYYY-MM-DD)');
  const b = dayBounds(tanggal);
  const shifts = await KasShift.findAll({
    where: {
      BUKA_AT: {
        [Op.gte]: b.start,
        [Op.lte]: b.end,
      },
    },
    include: [{ model: Pengguna, as: 'kasir', attributes: ['ID', 'NAMA'] }],
    order: [['BUKA_AT', 'ASC']],
  });

  const baris = [];
  let totalCash = 0; let totalNonCash = 0; let totalSelisih = 0;
  for (const s of shifts) {
    const calc = await computeExpected(s);
    const selisih = s.STATUS === 0 ? Number(s.SELISIH_CASH) || 0 : 0;
    baris.push({
      id_shift: s.ID,
      kasir: s.kasir ? s.kasir.NAMA : null,
      station: s.STATION,
      buka_at: s.BUKA_AT,
      tutup_at: s.TUTUP_AT,
      status: s.STATUS === 1 ? 'OPEN' : 'CLOSED',
      modal_awal: Number(s.MODAL_AWAL) || 0,
      cash_sales: calc.cash_sales,
      non_cash_sales: calc.non_cash_sales,
      total_sales: calc.total_sales,
      expected_cash: calc.expected_cash,
      actual_cash: s.STATUS === 0 ? Number(s.ACTUAL_CASH) || 0 : null,
      selisih_cash: s.STATUS === 0 ? selisih : null,
    });
    totalCash += calc.cash_sales;
    totalNonCash += calc.non_cash_sales;
    totalSelisih += selisih;
  }

  return {
    tanggal: b.ymd,
    jumlah_shift: shifts.length,
    shift: baris,
    ringkasan: {
      total_cash_sales: totalCash,
      total_non_cash_sales: totalNonCash,
      total_omzet: totalCash + totalNonCash,
      total_selisih_cash: totalSelisih,
    },
  };
}

module.exports = {
  getActive, getActiveView, open, addMutasi, closePreview, close, getById, list, reportDaily,
};
