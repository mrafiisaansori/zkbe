require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  appUrl: process.env.APP_URL || '',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'lavenia1_pos',
  },
  basicAuth: {
    username: process.env.BASIC_AUTH_USERNAME || 'admin',
    password: process.env.BASIC_AUTH_PASSWORD || 'rahasia',
  },
  // JWT - identitas user (id, merchant_id, level) untuk multi-tenant.
  jwt: {
    secret: process.env.JWT_SECRET || 'ganti-secret-ini-di-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '12h',
  },
  // SMTP untuk pengiriman email OTP registrasi merchant.
  // Semua nilai diambil dari .env (JANGAN hardcode kredensial di sini).
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true', // 465 = SSL
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '',
    fromName: process.env.SMTP_FROM_NAME || 'Zona Kasir',
  },
  // OTP
  otp: {
    ttlMinutes: Number(process.env.OTP_TTL_MINUTES || 10),
    resendCooldownSeconds: Number(process.env.OTP_RESEND_COOLDOWN || 60),
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS || 5),
  },
  // Feature flags. Fitur "pesan dari meja" (QR self-order) dimatikan sementara.
  // Aktifkan lagi dengan set FEATURE_QR_ORDER=true di .env (default: nonaktif).
  features: {
    qrOrder: String(process.env.FEATURE_QR_ORDER || 'false') === 'true',
  },
  // Cloudflare Turnstile. Verifikasi AKTIF hanya bila secret di-set (production).
  // Lokal tanpa secret -> dilewati, jadi dev tetap lancar.
  turnstile: {
    secret: process.env.TURNSTILE_SECRET_KEY || '',
  },
  // Midtrans payment gateway (QRIS dinamis) - KHUSUS merchant plan BUSINESS.
  // SERVER_KEY hanya dipakai di backend (charge + verifikasi signature webhook).
  // CLIENT_KEY boleh dikirim ke frontend bila perlu. JANGAN hardcode nilai asli
  // di repo — isi di .env server. Default isProduction=false (sandbox/demo).
  midtrans: {
    merchantId: process.env.MIDTRANS_MERCHANT_ID || '',
    clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
    serverKey: process.env.MIDTRANS_SERVER_KEY || '',
    isProduction: String(process.env.MIDTRANS_IS_PRODUCTION || 'false') === 'true',
  },
  // Akun Midtrans khusus penagihan upgrade plan. Dipisahkan dari gateway
  // transaksi POS merchant agar settlement dan webhook tidak bercampur.
  billingMidtrans: {
    merchantId: process.env.BILLING_MIDTRANS_UPGRADE_PLAN_MERCHANT_ID || '',
    clientKey: process.env.BILLING_MIDTRANS_UPGRADE_PLAN_CLIENT_KEY || '',
    serverKey: process.env.BILLING_MIDTRANS_UPGRADE_PLAN_SERVER_KEY || '',
    isProduction: String(process.env.BILLING_MIDTRANS_UPGRADE_PLAN_IS_PRODUCTION || 'false') === 'true',
  },
};
