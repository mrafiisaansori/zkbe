const { Identitas } = require('../models');
const ApiError = require('../utils/ApiError');
const { formatRupiah } = require('../utils/helpers');
const { assertProFeature } = require('../utils/plan');
const penjualanService = require('./penjualanService');

const WAGATEWAY_URL = process.env.WAGATEWAY_URL || 'https://wazapp.web.id';
const WAGATEWAY_USER = process.env.WAGATEWAY_USER;
const WAGATEWAY_PASS = process.env.WAGATEWAY_PASS;

// Kirim struk via WA khusus plan PRO ke atas (BUSINESS otomatis ikut, superset
// PRO) - divalidasi di BACKEND, bukan sekadar disembunyikan di UI.
async function assertPro() {
  await assertProFeature('Kirim struk via WhatsApp hanya tersedia untuk merchant plan PRO. Upgrade ke PRO untuk mengaktifkannya.');
}

function padEndSafe(str, len) {
  str = String(str);
  return str.length >= len ? `${str.slice(0, len - 1)}…` : str.padEnd(len);
}
function rupiahPlain(n) {
  return (Number(n) || 0).toLocaleString('id-ID');
}

/**
 * Susun teks struk buat WhatsApp. Item pakai blok ``` (monospace) biar kolom
 * nama & harga rata, format bold/italic pakai sintaks WA asli (*bold*, _italic_).
 * Angka & baris meniru persis Receipt.tsx (struk cetak) biar konsisten.
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
  const tanggalJam = `${trx.TANGGAL} ${String(trx.JAM || '').slice(0, 5)}`;

  const itemLines = items.map((d) => {
    const nama = d.produk?.NAMA || `Produk #${d.ID_PRODUK}`;
    const left = padEndSafe(`${d.QTY}x ${nama}`, 18);
    const right = rupiahPlain(d.HARGA_JUAL * d.QTY).padStart(10);
    return left + right;
  }).join('\n');

  const lines = [
    '🧾 *STRUK BELANJA*',
    `*${namaToko}*`,
  ];
  if (alamat) lines.push(alamat);
  lines.push('');
  lines.push(`No. Nota : ${trx.NO_NOTA}`);
  lines.push(`Tanggal  : ${tanggalJam}`);
  lines.push(`Kasir    : ${trx.kasir?.NAMA || '-'}`);
  lines.push('```');
  lines.push(itemLines || '-');
  lines.push('```');
  lines.push(`Subtotal : ${formatRupiah(subtotal)}`);
  if (diskonItem > 0) lines.push(`Diskon item : -${formatRupiah(diskonItem)}`);
  if (diskon > 0) lines.push(`Diskon   : -${formatRupiah(diskon)}`);
  if (diskonVoucher > 0) lines.push(`Voucher${trx.KODE_VOUCHER ? ` (${trx.KODE_VOUCHER})` : ''} : -${formatRupiah(diskonVoucher)}`);
  if (ppn > 0) lines.push(`PPN      : ${formatRupiah(ppn)}`);
  if (service > 0) lines.push(`Service  : ${formatRupiah(service)}`);
  lines.push(`*Total    : ${formatRupiah(total)}*`);
  lines.push('');
  lines.push(`Metode   : ${trx.jenisBayar?.NAMA || '-'}`);
  lines.push(`Status   : ${trx.STATUS_BAYAR || 'LUNAS'}`);
  lines.push('');
  lines.push('Terima kasih sudah berbelanja! 🙏');
  lines.push('_Struk ini dikirim otomatis via Zona Kasir_');
  return lines.join('\n');
}

async function kirimKeWaGateway(nomor, pesan) {
  if (!WAGATEWAY_USER || !WAGATEWAY_PASS) {
    throw new ApiError(500, 'WA Gateway belum dikonfigurasi di server (WAGATEWAY_USER/WAGATEWAY_PASS kosong).');
  }
  const auth = Buffer.from(`${WAGATEWAY_USER}:${WAGATEWAY_PASS}`).toString('base64');
  let res;
  try {
    res = await fetch(`${WAGATEWAY_URL}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
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
