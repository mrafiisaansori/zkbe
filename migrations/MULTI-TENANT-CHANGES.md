# Multi-Tenant (Multi Merchant) — Perubahan & Cara Update

Dokumen ini merangkum perubahan database & langkah setup. **Jangan jalankan query DB otomatis** — jalankan manual sesuai urutan di bawah.

## 1. Langkah setup (urut)

1. **Backup database** dulu.
2. Jalankan `migrations/multi-tenant.sql` di phpMyAdmin / CLI.
   - Jika `m_qris` / kolom `STATUS_BAYAR` belum ada (fitur QRIS sebelumnya), jalankan juga `migrations/qris.sql` lebih dulu.
3. Di folder `pos-backend`: `npm install` (menambah `jsonwebtoken` & `nodemailer`).
4. Set `.env` backend: `JWT_SECRET` (acak & panjang) dan `SMTP_*` (lihat `.env.example`).
5. (Opsional) buat akun **Super Admin** — lihat bagian 6.
6. Restart backend (`npm run dev` / `npm start`) dan frontend.

## 2. Tabel BARU

| Tabel | Fungsi |
|---|---|
| `m_merchant` | Data toko/tenant (nama, pemilik, email, phone, alamat, kota, provinsi, kategori usaha, `INVOICE_PREFIX`, `STATUS`). |
| `m_registration_otp` | Registrasi merchant pending + OTP. `OTP_HASH` (hash bcrypt, bukan plaintext), `PAYLOAD` (JSON data sementara), `EXPIRES_AT`, `LAST_SENT_AT`, `ATTEMPTS`, `VERIFIED`. |

## 3. Kolom BARU

- `MERCHANT_ID int(11)` ditambahkan ke **semua tabel tenant** (lihat daftar di bagian 5).
- Tidak ada perubahan kolom lain selain `MERCHANT_ID` (kolom `STATUS_BAYAR` di `t_penjualan` berasal dari fitur QRIS sebelumnya).

## 4. Index & Relasi

- **Index** `idx_*_merchant` pada kolom `MERCHANT_ID` tiap tabel tenant (untuk performa filter).
- `m_merchant`: `UNIQUE` pada `EMAIL` dan `PHONE` (email & nomor HP unik antar merchant).
- **Relasi** (logis; FK fisik opsional, lihat bagian 7 di file SQL): setiap tabel tenant `MERCHANT_ID → m_merchant.ID`.

## 5. Tabel yang ditambah `MERCHANT_ID`

`m_pengguna`, `m_produk`, `m_kategori`, `m_supplier`, `m_jenis_bayar`, `m_identitas`, `m_qris`,
`t_penjualan`, `t_detail_penjualan`, `t_pembelian`, `t_detail_pembelian`, `t_retur`, `t_detail_retur`,
`t_rekam_stok`, `t_penyusutan_produk`, `t_transaksi`.

## 6. Migrasi data lama → merchant default

- Dibuat `m_merchant` `ID = 1` (nama diambil dari `m_identitas`).
- Semua baris lama di tabel tenant di-`UPDATE ... SET MERCHANT_ID = 1`.
- User lama tetap: `LEVEL 1` = Admin Merchant, `LEVEL 2` = Kasir (milik merchant 1).

## 7. Role / level

| LEVEL | Role | Akses |
|---|---|---|
| 0 | Super Admin | Semua merchant (kelola/lihat status). `MERCHANT_ID = NULL`. |
| 1 | Admin Merchant | Hanya tokonya sendiri. |
| 2 | Kasir | Transaksi untuk merchant tempat ia terdaftar. |

Buat Super Admin via DB (uncomment di bagian 8 `multi-tenant.sql`). Buat hash password:

```
node -e "console.log(require('bcryptjs').hashSync('PasswordAnda', 10))"
```

## 8. Cara isolasi data dijamin (keamanan)

- Login mengembalikan **JWT** berisi `merchant_id`, `level`, `role`. Frontend mengirimnya sebagai `Authorization: Bearer <token>`.
- Backend mengambil `merchant_id` **dari token**, lalu menyimpannya di konteks request (AsyncLocalStorage).
- Hook Sequelize (`beforeFind/Count/Create/BulkUpdate/BulkDestroy`) **otomatis** menambahkan `WHERE MERCHANT_ID = <dari token>` dan mengisi `MERCHANT_ID` saat create — di **semua** model tenant. Jadi `merchant_id` tidak pernah dipercaya dari input frontend.
- Super Admin (level 0) tidak di-scope (boleh lihat semua).
- Akses lintas merchant otomatis mengembalikan data kosong / 404; endpoint super admin dijaga `403` untuk non-super-admin.

## 9. Alur registrasi merchant

`Register (/register)` → simpan pending + kirim OTP email (SMTP) → `Verifikasi OTP (/verify-otp)` → jika benar: buat `m_merchant` (active) + Admin Merchant (LEVEL 1) + data default (identitas, QRIS nonaktif, jenis bayar Cash & QRIS) → login sebagai Admin Merchant.

- OTP: 6 digit, masa berlaku `OTP_TTL_MINUTES` (default 10 mnt), resend dengan cooldown `OTP_RESEND_COOLDOWN` (default 60 dtk), maksimal `OTP_MAX_ATTEMPTS` percobaan.
- Nomor nota memakai prefix merchant, mis. `TZK-000025` (unik antar merchant).

## 10. Catatan username

Login memakai `username` global. Pastikan **username unik lintas merchant** (registrasi sudah memvalidasi). Untuk akun kasir yang dibuat Admin Merchant, gunakan username yang tidak bentrok antar toko.
