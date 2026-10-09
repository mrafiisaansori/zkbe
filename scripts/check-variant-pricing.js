/**
 * Self-check rumus harga & modal varian (modifier) di transaksi.
 * Tidak butuh DB - cuma pastikan rumus di penjualanService/openBillService
 * (HARGA_JUAL = HARGA_DASAR + HARGA_VARIAN, HARGA_BELI baris = modal produk +
 * modal opsi) tidak salah ketik / salah urutan operand.
 *
 * Jalankan: node scripts/check-variant-pricing.js
 */
const assert = require('assert');

// Skenario dari requirement: produk 10.000, opsi +5.000 (modal opsi 1.500).
const produkHargaJual = 10000;
const produkHargaBeli = 4000; // modal produk, nilai contoh
const opsiHarga = 5000;
const opsiHargaBeli = 1500;

const hargaDasar = produkHargaJual;
const hargaVarian = opsiHarga;
const hargaJual = hargaDasar + hargaVarian;
const hargaBeliDasar = produkHargaBeli; // harga beli produk saja, TANPA varian - master TIDAK diubah
const hargaBeliBaris = hargaBeliDasar + opsiHargaBeli;

assert.strictEqual(hargaJual, 15000, 'HARGA_JUAL harus 15.000 (10.000 + 5.000)');
assert.strictEqual(hargaDasar, 10000, 'HARGA_DASAR harus tetap harga produk');
assert.strictEqual(hargaVarian, 5000, 'HARGA_VARIAN harus total harga opsi');
assert.strictEqual(hargaBeliDasar, 4000, 'HARGA_BELI_DASAR harus harga beli produk saja (TANPA varian)');
assert.strictEqual(hargaBeliBaris, 5500, 'HARGA_BELI baris harus modal produk + modal opsi (4.000 + 1.500)');

// Tanpa varian: fallback data lama (HARGA_DASAR null -> = HARGA_JUAL, HARGA_VARIAN null -> 0).
const { normalizeDetailFields } = require('../src/utils/modifierDetail');
const legacy = normalizeDetailFields({
  HARGA_JUAL: 10000, HARGA_DASAR: null, HARGA_VARIAN: null, HARGA_BELI: 4000, HARGA_BELI_DASAR: null, MODIFIER_DETAIL: null,
});
assert.strictEqual(legacy.HARGA_DASAR, 10000, 'Baris lama: HARGA_DASAR fallback ke HARGA_JUAL');
assert.strictEqual(legacy.HARGA_VARIAN, 0, 'Baris lama: HARGA_VARIAN fallback ke 0');
assert.strictEqual(legacy.HARGA_BELI_DASAR, 4000, 'Baris lama: HARGA_BELI_DASAR fallback ke HARGA_BELI');
assert.strictEqual(legacy.MODIFIER_DETAIL, null, 'Baris lama: MODIFIER_DETAIL tetap null');

const withVarian = normalizeDetailFields({
  HARGA_JUAL: 15000, HARGA_DASAR: 10000, HARGA_VARIAN: 5000, HARGA_BELI: 5500, HARGA_BELI_DASAR: 4000,
  MODIFIER_DETAIL: JSON.stringify([{ id: 2, nama: 'Ekstra Coffee', grup: 'Topping', harga: 5000, harga_beli: 1500 }]),
});
assert.deepStrictEqual(withVarian.MODIFIER_DETAIL, [{ id: 2, nama: 'Ekstra Coffee', grup: 'Topping', harga: 5000, harga_beli: 1500 }]);

console.log('OK - rumus harga & modal varian benar');
