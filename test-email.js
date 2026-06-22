/**
 * Skrip uji kirim email SMTP (jalankan dari LOKAL).
 *
 * Cara pakai (di folder pos-backend):
 *   node test-email.js                 -> kirim ke SMTP_FROM_EMAIL (diri sendiri)
 *   node test-email.js tujuan@mail.com -> kirim ke alamat tertentu
 *
 * Skrip ini memuat .env, mencetak konfigurasi (password disensor),
 * memverifikasi koneksi SMTP, lalu mengirim 1 email uji.
 * Semua error dicetak lengkap agar mudah ditrace.
 */
require('dotenv').config();
const nodemailer = require('nodemailer');

const host = process.env.SMTP_HOST || '';
const port = Number(process.env.SMTP_PORT || 465);
const secure = String(process.env.SMTP_SECURE || 'true') === 'true';
const user = process.env.SMTP_USER || '';
const pass = process.env.SMTP_PASS || '';
const fromEmail = process.env.SMTP_FROM_EMAIL || user;
const fromName = process.env.SMTP_FROM_NAME || 'ZONA KASIR';
const to = process.argv[2] || fromEmail;

const mask = (s) => (s ? s.slice(0, 2) + '***' + s.slice(-1) : '(kosong)');

console.log('=========== KONFIG SMTP ===========');
console.log('HOST    :', host);
console.log('PORT    :', port, '| secure:', secure);
console.log('USER    :', user);
console.log('PASS    :', mask(pass), `(panjang ${pass.length})`);
console.log('FROM    :', `"${fromName}" <${fromEmail}>`);
console.log('TUJUAN  :', to);
console.log('===================================\n');

const transporter = nodemailer.createTransport({
  host, port, secure,
  auth: { user, pass },
  tls: { rejectUnauthorized: false },
  connectionTimeout: 15000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
  logger: true,  // log proses SMTP ke console
  debug: true,   // tampilkan percakapan SMTP
});

(async () => {
  try {
    console.log('>> Verifikasi koneksi SMTP...');
    await transporter.verify();
    console.log('✓ Koneksi & login SMTP BERHASIL.\n');

    console.log('>> Mengirim email uji...');
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: 'Tes Email Zona Kasir',
      text: 'Ini email uji dari test-email.js. Jika Anda menerima ini, SMTP sudah bekerja.',
      html: '<h2 style="color:#0a6cb0">Tes Email Zona Kasir</h2><p>Jika Anda menerima ini, SMTP sudah bekerja. ✅</p>',
    });
    console.log('\n✓ EMAIL TERKIRIM!');
    console.log('messageId:', info.messageId);
    console.log('response :', info.response);
    console.log('accepted :', info.accepted);
    console.log('rejected :', info.rejected);
    console.log('\nCek inbox (dan folder SPAM) di:', to);
    process.exit(0);
  } catch (err) {
    console.error('\n✗ GAGAL KIRIM EMAIL');
    console.error('code   :', err && err.code);
    console.error('command:', err && err.command);
    console.error('message:', err && err.message);
    console.error('\n--- Petunjuk ---');
    if (err && /EAUTH|535|Invalid login/i.test(`${err.code} ${err.message}`))
      console.error('→ Username/password email SALAH. Cek akun di cPanel > Email Accounts & coba login Webmail.');
    else if (err && /ECONNREFUSED|ETIMEDOUT|timeout|ENOTFOUND|EAI_AGAIN/i.test(`${err.code} ${err.message}`))
      console.error('→ Host/port salah atau diblokir. Coba SMTP_HOST=localhost, atau port 587 + SMTP_SECURE=false.');
    else if (err && /certificate|altnames|self.signed/i.test(`${err.message}`))
      console.error('→ Masalah sertifikat TLS (sudah dilonggarkan, jika tetap muncul cek host).');
    process.exit(1);
  }
})();
