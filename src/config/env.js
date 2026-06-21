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
  smtp: {
    host: process.env.SMTP_HOST || 'mail.raftechsolution.web.id',
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true', // 465 = SSL
    user: process.env.SMTP_USER || 'linkatalog@raftechsolution.web.id',
    pass: process.env.SMTP_PASS || '',
    fromEmail: process.env.SMTP_FROM_EMAIL || 'linkatalog@raftechsolution.web.id',
    fromName: process.env.SMTP_FROM_NAME || 'Linkatalog',
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
};
