// Helper untuk field rincian varian di baris detail transaksi (t_detail_penjualan
// & t_open_bill_detail): HARGA_DASAR, HARGA_VARIAN, HARGA_BELI_DASAR, MODIFIER_DETAIL
// (JSON text). Baris lama (sebelum fitur ini) tidak punya nilai ini -> fallback saat dibaca.

function parseModifierDetail(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (_) { return null; }
}

// d: plain object hasil toJSON() pada DetailPenjualan/OpenBillDetail.
function normalizeDetailFields(d) {
  return {
    ...d,
    HARGA_DASAR: d.HARGA_DASAR != null ? d.HARGA_DASAR : d.HARGA_JUAL,
    HARGA_VARIAN: d.HARGA_VARIAN != null ? d.HARGA_VARIAN : 0,
    HARGA_BELI_DASAR: d.HARGA_BELI_DASAR != null ? d.HARGA_BELI_DASAR : d.HARGA_BELI,
    MODIFIER_DETAIL: parseModifierDetail(d.MODIFIER_DETAIL),
  };
}

module.exports = { parseModifierDetail, normalizeDetailFields };
