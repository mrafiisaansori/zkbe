-- =====================================================================
-- Migration: Tambah metode pembayaran "Transfer" untuk merchant existing.
-- Jalankan MANUAL. Aman & idempotent (hanya menambah jika belum ada).
-- Merchant baru otomatis mendapat Cash, QRIS, Transfer saat registrasi.
-- =====================================================================

INSERT INTO `m_jenis_bayar` (`NAMA`, `MERCHANT_ID`)
SELECT 'Transfer', m.`ID`
FROM `m_merchant` m
WHERE NOT EXISTS (
  SELECT 1 FROM `m_jenis_bayar` jb
  WHERE jb.`MERCHANT_ID` = m.`ID` AND UPPER(jb.`NAMA`) = 'TRANSFER'
);

-- (Opsional) Jika ada data lama tanpa MERCHANT_ID dan Anda hanya 1 merchant,
-- sesuaikan manual. Untuk multi-merchant, query di atas sudah memetakan per toko.
