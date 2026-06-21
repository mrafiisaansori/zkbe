# POS Backend (Node.js)

Backend POS hasil **migrasi dari aplikasi CodeIgniter 3 (PHP 7.3)** ke **Node.js**.
Dibangun ulang agar logika bisnis, struktur data, dan alur transaksi mengikuti sistem POS lama
(controller `Login`, `Kasir`, `Admin`, `Urgent` + `Admin_model`/`Login_model`), tetapi dengan
arsitektur yang bersih, modular, dan mudah dikembangkan.

> Proyek CodeIgniter lama **tidak diubah**. Backend baru berdiri sendiri di folder `pos-backend/`
> dan terhubung ke database MySQL yang sama.

## Stack

| Bagian            | Teknologi |
|-------------------|-----------|
| Runtime           | Node.js |
| Framework         | Express.js |
| ORM               | Sequelize (driver `mysql2`) |
| Database          | MySQL (skema sama dengan POS existing) |
| Validasi request  | Joi |
| Dokumentasi API   | Swagger (swagger-jsdoc + swagger-ui-express) |
| Proteksi API/Docs | Basic Authentication (`express-basic-auth`) |
| Logging           | morgan |

## Struktur Folder

```
pos-backend/
├── src/
│   ├── config/        # env & koneksi database (Sequelize)
│   ├── controllers/   # handler request -> panggil service
│   ├── middlewares/   # basicAuth, validate, role, errorHandler
│   ├── routes/        # definisi endpoint + anotasi Swagger
│   ├── services/      # logika bisnis (migrasi dari controller/model CI)
│   ├── models/        # model Sequelize (mapping tabel m_* & t_*)
│   ├── validations/   # skema Joi per endpoint
│   ├── utils/         # ApiError, response standar, helper, catchAsync
│   ├── app.js         # konfigurasi express (middleware, swagger, routes)
│   └── server.js      # entry point (koneksi DB + listen)
├── swagger/           # konfigurasi spesifikasi Swagger
├── migrations/
│   └── schema.sql     # skema + view + seed (untuk DB baru/kosong)
├── .env.example
├── package.json
└── README.md
```

## Cara Install

```bash
cd pos-backend
npm install
```

## Konfigurasi Database

1. Salin `.env.example` menjadi `.env`:

   ```bash
   cp .env.example .env
   ```

2. Sesuaikan isinya:

   ```env
   PORT=3000

   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=lavenia1_pos

   BASIC_AUTH_USERNAME=admin
   BASIC_AUTH_PASSWORD=rahasia
   ```

3. Database:
   - **Memakai database POS existing** (rekomendasi): cukup arahkan `DB_NAME` ke database lama.
     Nama tabel & kolom sudah sama persis, jadi tidak perlu migrasi apa pun.
   - **Membuat database baru**: buat database kosong lalu import skema:

     ```bash
     mysql -u root -p nama_db_baru < migrations/schema.sql
     ```

     `migrations/schema.sql` berisi semua tabel (`m_*`, `t_*`), seluruh `view_*`, dan seed minimal
     (akun `admin`/`kasir1`, jenis bayar `Cash`, kategori default, identitas toko).

> Backend **tidak pernah** menjalankan `sync({ force })` atau menghapus tabel — aman terhadap
> database existing. Migrasi hanya dijalankan manual oleh Anda lewat `schema.sql`.

## Cara Menjalankan

```bash
npm start      # produksi
npm run dev    # mode development (nodemon, auto-reload)
```

Server berjalan di `http://localhost:3000`.
Cek kesehatan: `GET http://localhost:3000/health` (tanpa auth).

## Swagger

- URL: **`http://localhost:3000/api-docs`**
- Spec JSON: `http://localhost:3000/api-docs.json`
- Swagger **dilindungi Basic Auth** — browser akan meminta kredensial saat dibuka.
- Setiap endpoint terdokumentasi: method, path, request body, query/path params,
  contoh response, status code, dan kebutuhan auth.

## Basic Auth

Seluruh `/api/*` **dan** halaman Swagger `/api-docs` dilindungi Basic Authentication.

```
username: admin
password: rahasia
```

Kredensial dibaca dari `.env` (`BASIC_AUTH_USERNAME` / `BASIC_AUTH_PASSWORD`) — tidak di-hardcode.

Contoh request:

```bash
curl -u admin:rahasia http://localhost:3000/api/produk
```

## Role admin & kasir

Tabel `m_pengguna` menyimpan kolom `LEVEL`: **1 = admin**, **2 = kasir**.
Endpoint `POST /api/auth/login` memvalidasi username/password dan mengembalikan data user
beserta `role` (`admin`/`kasir`). Sesuai keputusan proyek, proteksi utama memakai **Basic Auth**;
guard per-role tersedia secara opsional di `src/middlewares/role.js` (membaca header `x-user-level`)
bila nanti ingin diperketat.

## Daftar Endpoint Utama

Semua endpoint memakai prefix `/api`.

### Auth
- `POST /auth/login` — login admin/kasir

### Master Data
- `GET/POST /produk`, `GET/PUT/DELETE /produk/{id}`
- `GET /produk/barcode/{barcode}` — cari produk via barcode (scan kasir)
- `POST /produk/{id}/stok` — penyesuaian stok insidentil (tambah/kurang)
- `GET /produk/{id}/stok-history` — riwayat pergerakan stok
- `GET/POST /kategori`, `GET/PUT/DELETE /kategori/{id}`
- `GET/POST /supplier`, `GET/PUT/DELETE /supplier/{id}`
- `GET/POST /jenis-bayar`, `GET/PUT/DELETE /jenis-bayar/{id}`
- `GET/PUT /identitas` — identitas toko

### Pengguna (manajemen user)
- `GET/POST /pengguna`, `GET/PUT/DELETE /pengguna/{id}`
- `POST /pengguna/{id}/reset-password`, `POST /pengguna/{id}/change-password`

### Transaksi Penjualan (kasir)
- `GET /penjualan` — daftar (filter tanggal, kasir, status)
- `POST /penjualan/checkout` — checkout/bayar (validasi stok, simpan header+detail+rekam stok, kurangi stok)
- `GET /penjualan/{id}` — detail transaksi + item
- `POST /penjualan/{id}/void` — batalkan & kembalikan stok

### Pembelian / Restok
- `GET/POST /pembelian`, `GET/PUT/DELETE /pembelian/{id}`
- `POST /pembelian/{id}/detail`, `DELETE /pembelian/{id}/detail/{idDetail}`
- `POST /pembelian/{id}/selesaikan` — tambah stok & update harga beli

### Retur
- `GET/POST /retur`, `GET/PUT/DELETE /retur/{id}`
- `POST /retur/{id}/detail` — kurangi stok (validasi stok cukup)
- `DELETE /retur/{id}/detail/{idDetail}` — batalkan & kembalikan stok

### Penyusutan Harga
- `GET /penyusutan/produk/{id}`, `POST /penyusutan/produk/{id}`
- `DELETE /penyusutan/{id}` — kembalikan harga jual awal

### Keuangan & Laporan
- `GET/POST /transaksi-keuangan`, `DELETE /transaksi-keuangan/{id}`
- `GET /laporan/penjualan` — laporan penjualan per tanggal/kasir
- `GET /laporan/pendapatan` — omzet, modal, laba (laba-rugi)
- `GET /laporan/stok` — stok + nilai stok
- `GET /laporan/penyusutan`

### Dashboard
- `GET /dashboard/summary` — ringkasan (penjualan hari ini, jumlah produk/user, stok menipis)
- `GET /dashboard/chart?tahun=YYYY` — grafik laba & omzet bulanan

## Catatan Migrasi CodeIgniter 3 → Node.js

Pemetaan logika dari sistem lama:

| CodeIgniter 3 | Node.js |
|---|---|
| `Login::login()` | `authService.login()` — cek username lalu cocokkan password (tetap plaintext seperti DB lama) |
| `Kasir::bayar()` (CI Cart) | `penjualanService.checkout()` — keranjang dikirim dari client sebagai array `items`; semua operasi dibungkus 1 transaksi DB |
| `Kasir::barcode()` / `beli()` | `GET /produk/barcode/{barcode}` + validasi stok di checkout |
| `Admin::selesaikanPembelian()` | `pembelianService.selesaikan()` |
| `Admin::tambahDetailRetur()` / `deleteDetailRetur()` | `returService.addDetail()` / `removeDetail()` |
| `Admin_model::ubahStokProduk()` / `insertRekamStok()` | dipanggil di dalam service terkait (`t_rekam_stok` JENIS 1=masuk, 2=keluar) |
| `Urgent::dopenyusutan()` / `hapuspenyusutan()` | `penyusutanService.create()` / `remove()` |
| `Admin::insertTransaksiKeuangan()` & laporan keuangan | `transaksiService` + `laporanService` |
| `Admin::showChart()` (laba/omzet 12 bulan) | `dashboardService.chartTahunan()` |
| `view_*` (MySQL view) | direplikasi via Sequelize `include`/JOIN antar model |

**Perbedaan teknis yang disengaja:**
- **Sesi → stateless.** CI memakai session PHP (`id_kasir`, `id_admin`, keranjang Cart).
  Versi Node stateless: `id_user` & daftar item dikirim eksplisit pada body request. Cocok untuk konsumsi REST/SPA/mobile.
- **Atomicity.** Operasi multi-tabel (checkout, selesaikan pembelian, retur, penyusutan, void)
  dijalankan dalam `sequelize.transaction()` agar konsisten — lebih kuat dari versi CI.
- **Anti SQL injection.** Query mentah CI diganti query parameterized Sequelize.
- **Response standar JSON** `{ success, message, data }` + error handler terpusat dengan status code yang sesuai.

## Fitur yang Sudah Dimigrasi

Auth/login, role admin & kasir, master produk, kategori, supplier, jenis bayar, identitas toko,
manajemen user (+ reset/ubah password), stok & riwayat stok (`t_rekam_stok`), transaksi penjualan
+ detail + pembayaran (checkout) + void, pembelian/restok + detail + penyelesaian, retur + detail,
penyusutan harga, transaksi keuangan, laporan penjualan, laporan pendapatan/laba-rugi, laporan stok,
laporan penyusutan, dashboard summary, dan grafik tahunan.

## Perlu Validasi Manual

- **Password plaintext.** DB lama menyimpan password apa adanya (mis. `rahasia`); ini dipertahankan
  agar kompatibel dengan data existing. Sangat disarankan beralih ke hashing (bcrypt) — perlu keputusan Anda.
- **`JENIS_TRANSAKSI` pada `t_transaksi`** diasumsikan `M` (masuk) / `K` (keluar). Cek konvensi nyata di data Anda; sesuaikan di `validations` bila berbeda.
- **Cetak struk & kirim WhatsApp** (`Kasir::cetak`, `kirimWa`) adalah fitur view/UI CI dan **tidak**
  dibuat di backend; data untuk struk tersedia via `GET /penjualan/{id}`.
- **Upload foto produk & logo** ditangani sebagai field string path (`FOTO`, `LOGO`) seperti DB lama;
  mekanisme upload file (multer) belum disertakan — tambahkan bila diperlukan.
- **Status pembelian/retur** mengikuti pola CI (0 draft / 1 selesai). Verifikasi alur retur sesuai kebutuhan operasional Anda.
- **Integrasi penuh ke MySQL** belum dapat diuji end-to-end di lingkungan build ini (tanpa server MySQL); aplikasi sudah lolos uji muat, routing, Basic Auth, validasi, dan error handling. Jalankan terhadap database Anda untuk verifikasi akhir.
```
