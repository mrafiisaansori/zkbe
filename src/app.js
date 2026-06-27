const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const basicAuth = require('./middlewares/basicAuth');
const authJwt = require('./middlewares/authJwt');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const publicAuthRoutes = require('./routes/auth.routes');
const publicWilayahRoutes = require('./routes/wilayah.routes');
const routes = require('./routes');
const swaggerSpec = require('../swagger/swagger');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check (tanpa auth) untuk monitoring.
app.get('/health', (req, res) => res.json({ success: true, status: 'up' }));

// Gambar (produk & QRIS) diakses publik agar bisa dimuat di tag <img>.
// Contoh: http://localhost:3000/uploads/products/namafile.jpg
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Swagger UI tetap di belakang Basic Auth (dokumentasi developer).
app.use('/api-docs', basicAuth, swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'POS Backend API Docs',
}));
app.get('/api-docs.json', basicAuth, (req, res) => res.json(swaggerSpec));

// Rute auth PUBLIK (tanpa JWT): login, registrasi merchant, verifikasi & resend OTP.
app.use('/api/auth', publicAuthRoutes);

// Referensi wilayah PUBLIK (dropdown provinsi/kota di form registrasi).
app.use('/api/wilayah', publicWilayahRoutes);

// QR Menu & Katalog PUBLIK (tanpa JWT). merchant_id diturunkan dari token/slug di server.
app.use('/api/public', require('./routes/public.routes'));

// Webhook/notification Midtrans PUBLIK (tanpa JWT). Keamanan via signature.
// HARUS di-mount SEBELUM authJwt agar tidak ditolak 401. merchant_id dari order_id.
app.use('/api/payments', require('./routes/paymentPublic.routes'));
app.use('/api/subscription', require('./routes/subscriptionPublic.routes'));

// Seluruh API lain dilindungi JWT (identitas + merchant_id diambil dari token).
app.use('/api', authJwt, routes);

// Redirect root -> docs
app.get('/', (req, res) => res.redirect('/api-docs'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
