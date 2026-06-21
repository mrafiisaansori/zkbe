// Helper umum, meniru sebagian fungsi dari CodeIgniter (formatRupiah, dll).
function formatRupiah(angka) {
  const n = Number(angka) || 0;
  return 'Rp ' + n.toLocaleString('id-ID');
}

// Nomor nota penjualan: 6 digit zero-padded (mengikuti sprintf("%06d") di CI).
function formatNoNota(id) {
  return String(id).padStart(6, '0');
}

// Zona waktu aplikasi (WIB / Asia/Jakarta). Diset lewat env agar fleksibel.
const APP_TZ = process.env.APP_TZ || 'Asia/Jakarta';

// Tanggal "hari ini" menurut zona waktu aplikasi (bukan UTC).
function todayDate() {
  // en-CA menghasilkan format YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()); // YYYY-MM-DD
}

// Jam "sekarang" menurut zona waktu aplikasi (HH:MM:SS).
function nowTime() {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date()); // HH:MM:SS
}

module.exports = { formatRupiah, formatNoNota, todayDate, nowTime };
