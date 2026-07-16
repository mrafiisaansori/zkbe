const { Identitas } = require('../models');
const ApiError = require('../utils/ApiError');
const { formatRupiah } = require('../utils/helpers');
const { assertProFeature } = require('../utils/plan');
const penjualanService = require('./penjualanService');

const WAGATEWAY_URL = process.env.WAGATEWAY_URL || 'https://wazapp.web.id';
const WAGATEWAY_API_KEY = process.env.WAGATEWAY_API_KEY;

// Kirim struk via WA khusus plan PRO ke atas (BUSINESS otomatis ikut, superset
// PRO) - divalidasi di BACKEND, bukan sekadar disembunyikan di UI.
async function assertPro() {
  await assertProFeature('Kirim struk via WhatsApp hanya tersedia untuk merchant plan PRO. Upgrade ke PRO untuk mengaktifkannya.');
}

// Lebar kolom dalam blok monospace (```) - WA cuma rata rapi DI DALAM blok
// kode, di luar itu fontnya proporsional jadi padding manual percuma. Karena
// itu semua baris yang butuh rata kolom (item + rincian total) digabung jadi
// SATU blok kode; baris info & footer sengaja dibiarkan teks natural.
const LABEL_WIDTH = 20;
const AMOUNT_WIDTH = 10;
const SEPARATOR = '-'.repeat(LABEL_WIDTH + AMOUNT_WIDTH);

function padEndSafe(str, len) {
  str = String(str);
  return str.length >= len ? `${str.slice(0, len - 1)}…` : str.padEnd(len);
}
function row(label, amount) {
  const amountStr = Number(amount).toLocaleString('id-ID');
  return padEndSafe(label, LABEL_WIDTH) + amountStr.padStart(AMOUNT_WIDTH);
}
function formatTanggalJam(tanggal, jam) {
  try {
    const d = new Date(`${tanggal}T${jam || '00:00:00'}`);
    const tgl = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    const j = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    return `${tgl}, ${j}`;
  } catch (e) {
    return `${tanggal} ${String(jam || '').slice(0, 5)}`;
  }
}

/**
 * Susun teks struk buat WhatsApp. Item + rincian total digabung dalam SATU
 * blok ``` (monospace) biar kolom nama/label & harga rata sempurna - baris
 * lain (header toko, info nota, footer) teks biasa karena tidak butuh rata
 * kolom. *Total* sengaja ditaruh di LUAR blok kode supaya tetap bisa bold
 * (format WA tidak berlaku di dalam blok kode).
 */
function formatStrukText(trx, identitas) {
  const namaToko = identitas?.NAMA || 'Toko';
  const alamat = identitas?.ALAMAT || '';
  const items = trx.detail || [];
  const subtotal = items.reduce((s, d) => s + d.HARGA_JUAL * d.QTY, 0);
  const diskonItem = items.reduce((s, d) => s + (Number(d.DISKON) || 0), 0);
  const diskon = Number(trx.DISKON) || 0;
  const diskonVoucher = Number(trx.DISKON_VOUCHER) || 0;
  const ppn = Number(trx.PPN) || 0;
  const service = Number(trx.SERVICE_CHARGE) || 0;
  const total = Number(trx.TOTAL) || 0;

  const blok = [];
  items.forEach((d) => {
    const nama = d.produk?.NAMA || `Produk #${d.ID_PRODUK}`;
    blok.push(row(`${d.QTY}x ${nama}`, d.HARGA_JUAL * d.QTY));
  });
  blok.push(SEPARATOR);
  blok.push(row('Subtotal', subtotal));
  if (diskonItem > 0) blok.push(row('Diskon item', -diskonItem));
  if (diskon > 0) blok.push(row('Diskon', -diskon));
  if (diskonVoucher > 0) blok.push(row(`Voucher${trx.KODE_VOUCHER ? ` (${trx.KODE_VOUCHER})` : ''}`, -diskonVoucher));
  if (ppn > 0) blok.push(row('PPN', ppn));
  if (service > 0) blok.push(row('Service', service));

  const lines = [
    '🧾 *STRUK BELANJA*',
    `*${namaToko}*`,
  ];
  if (alamat) lines.push(alamat);
  lines.push('');
  lines.push(`No. Nota: ${trx.NO_NOTA}`);
  lines.push(`Tanggal: ${formatTanggalJam(trx.TANGGAL, trx.JAM)}`);
  lines.push(`Kasir: ${trx.kasir?.NAMA || '-'}`);
  lines.push('');
  lines.push('```');
  lines.push(blok.join('\n'));
  lines.push('```');
  lines.push(`*TOTAL: ${formatRupiah(total)}*`);
  lines.push('');
  lines.push(`Metode: ${trx.jenisBayar?.NAMA || '-'}`);
  lines.push(`Status: ${trx.STATUS_BAYAR || 'LUNAS'}`);
  lines.push('');
  lines.push('Terima kasih sudah berbelanja! 🙏');
  lines.push('_Struk ini dikirim otomatis via Zona Kasir_');
  return lines.join('\n');
}

async function kirimKeWaGateway(nomor, pesan) {
  if (!WAGATEWAY_API_KEY) {
    throw new ApiError(500, 'WA Gateway belum dikonfigurasi di server (WAGATEWAY_API_KEY kosong).');
  }
  let res;
  try {
    res = await fetch(`${WAGATEWAY_URL}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${WAGATEWAY_API_KEY}` },
      body: JSON.stringify({ nomor, pesan }),
    });
  } catch (err) {
    throw new ApiError(502, `Tidak bisa menghubungi WA Gateway: ${err.message}`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(502, data.error || 'Gagal mengirim struk via WhatsApp (WA Gateway menolak).');
  }
  return data;
}

async function kirimStruk(idPenjualan, nomor) {
  await assertPro();

  const nomorBersih = String(nomor || '').replace(/\D/g, '');
  if (nomorBersih.length < 9 || nomorBersih.length > 15) {
    throw new ApiError(400, 'Nomor WhatsApp tidak valid. Gunakan format 62812xxxxxxx.');
  }

  const trx = await penjualanService.getById(idPenjualan);
  const identitas = await Identitas.findOne();
  const pesan = formatStrukText(trx, identitas);
  await kirimKeWaGateway(nomorBersih, pesan);
  return { terkirim: true, nomor: nomorBersih };
}

module.exports = { kirimStruk, formatStrukText };
