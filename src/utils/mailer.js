const nodemailer = require('nodemailer');
const env = require('../config/env');

// Transport SMTP dibuat sekali (lazy) dari konfigurasi env.
let transporter;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure, // true untuk port 465 (SSL)
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  return transporter;
}

const FROM = `"${env.smtp.fromName}" <${env.smtp.fromEmail}>`;

// Kirim email OTP verifikasi registrasi merchant.
async function sendOtpEmail(toEmail, { otp, storeName, ownerName }) {
  const subject = `Kode Verifikasi OTP - ${env.smtp.fromName}`;
  const text =
    `Halo ${ownerName || ''},\n\n` +
    `Kode OTP untuk verifikasi pendaftaran toko "${storeName || ''}" Anda adalah: ${otp}\n` +
    `Kode berlaku selama ${env.otp.ttlMinutes} menit. Jangan bagikan kode ini ke siapa pun.\n\n` +
    `Jika Anda tidak melakukan pendaftaran, abaikan email ini.`;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:auto;color:#1f2937">
      <h2 style="color:#03045e;margin-bottom:4px">Verifikasi Pendaftaran</h2>
      <p>Halo <b>${ownerName || ''}</b>,</p>
      <p>Gunakan kode berikut untuk memverifikasi pendaftaran toko <b>${storeName || ''}</b>:</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#eef2ff;color:#03045e;
                  text-align:center;padding:16px;border-radius:12px;margin:16px 0">${otp}</div>
      <p style="font-size:13px;color:#6b7280">Kode berlaku ${env.otp.ttlMinutes} menit. Jangan bagikan kode ini ke siapa pun.</p>
    </div>`;

  return getTransporter().sendMail({ from: FROM, to: toEmail, subject, text, html });
}

// Kirim email OTP reset password (lupa password).
async function sendPasswordResetEmail(toEmail, { otp, name }) {
  const subject = `Kode Reset Password - ${env.smtp.fromName}`;
  const text =
    `Halo ${name || ''},\n\n` +
    `Kami menerima permintaan reset password untuk akun Anda.\n` +
    `Kode OTP reset password Anda adalah: ${otp}\n` +
    `Kode berlaku selama ${env.otp.ttlMinutes} menit. Jangan bagikan kode ini ke siapa pun.\n\n` +
    `Jika Anda tidak meminta reset password, abaikan email ini.`;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:auto;color:#1f2937">
      <h2 style="color:#03045e;margin-bottom:4px">Reset Password</h2>
      <p>Halo <b>${name || ''}</b>,</p>
      <p>Gunakan kode berikut untuk mengatur ulang password akun Anda:</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#eef2ff;color:#03045e;
                  text-align:center;padding:16px;border-radius:12px;margin:16px 0">${otp}</div>
      <p style="font-size:13px;color:#6b7280">Kode berlaku ${env.otp.ttlMinutes} menit. Jangan bagikan kode ini ke siapa pun. Jika Anda tidak meminta reset, abaikan email ini.</p>
    </div>`;

  return getTransporter().sendMail({ from: FROM, to: toEmail, subject, text, html });
}

// Email notifikasi plan aktif setelah pembayaran Midtrans terkonfirmasi.
async function sendSubscriptionActivatedEmail(toEmail, { storeName, paket, expiresAt }) {
  const masa = expiresAt ? new Date(expiresAt).toLocaleString('id-ID', { dateStyle: 'long' }) : '-';
  const plan = String(paket || 'PRO').split(' ')[0];
  const subject = `Langganan ${plan} Aktif - ${env.smtp.fromName}`;
  const text =
    `Halo ${storeName || ''},\n\n` +
    `Pembayaran Midtrans telah dikonfirmasi. Toko Anda sekarang berstatus ${plan}.\n` +
    `Paket: ${paket}\nMasa aktif hingga: ${masa}\n\n` +
    `Plan aktif otomatis dan dapat langsung digunakan pada aplikasi.\n` +
    `Terima kasih telah berlangganan ${env.smtp.fromName}.`;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:auto;color:#1f2937">
      <h2 style="color:#03045e;margin-bottom:4px">Langganan ${plan} Aktif</h2>
      <p>Halo <b>${storeName || ''}</b>,</p>
      <p>Pembayaran Midtrans telah <b>dikonfirmasi</b>. Toko Anda sekarang berstatus <b>${plan}</b>.</p>
      <div style="background:#eef2ff;border-radius:12px;padding:14px;margin:14px 0">
        <p style="margin:0">Paket: <b>${paket}</b></p>
        <p style="margin:6px 0 0">Masa aktif hingga: <b>${masa}</b></p>
      </div>
      <p style="font-size:13px;color:#6b7280">Plan aktif otomatis dan dapat langsung digunakan pada aplikasi.</p>
      <p>Terima kasih telah berlangganan ${env.smtp.fromName}.</p>
    </div>`;
  return getTransporter().sendMail({ from: FROM, to: toEmail, subject, text, html });
}

// Kirim OTP untuk verifikasi penggantian email akun/toko (dikirim ke EMAIL BARU).
async function sendEmailChangeOtp(toEmail, { otp, storeName }) {
  const subject = `Kode Verifikasi Ganti Email - ${env.smtp.fromName}`;
  const text =
    `Anda meminta penggantian email akun toko "${storeName || ''}".\n` +
    `Kode OTP verifikasi email baru Anda: ${otp}\n` +
    `Kode berlaku ${env.otp.ttlMinutes} menit. Jika ini bukan Anda, abaikan email ini.`;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:auto;color:#1f2937">
      <h2 style="color:#03045e;margin-bottom:4px">Verifikasi Email Baru</h2>
      <p>Anda meminta penggantian email akun toko <b>${storeName || ''}</b>.</p>
      <p>Gunakan kode berikut untuk mengonfirmasi email baru ini:</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#eef2ff;color:#03045e;
                  text-align:center;padding:16px;border-radius:12px;margin:16px 0">${otp}</div>
      <p style="font-size:13px;color:#6b7280">Kode berlaku ${env.otp.ttlMinutes} menit. Jika ini bukan Anda, abaikan email ini.</p>
    </div>`;
  return getTransporter().sendMail({ from: FROM, to: toEmail, subject, text, html });
}

module.exports = { sendOtpEmail, sendPasswordResetEmail, sendSubscriptionActivatedEmail, sendEmailChangeOtp, getTransporter };
