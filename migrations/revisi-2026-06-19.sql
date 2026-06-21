-- =====================================================================
-- Migration revisi POS - 19 Juni 2026
-- Jalankan MANUAL di MySQL (mis. via phpMyAdmin / mysql CLI).
-- Aman dijalankan pada DB existing; tidak menghapus data/fitur.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Riwayat stok: tambahkan kolom ID_USER (siapa yang menginput/menyesuaikan
--    stok). Dipakai untuk pencatatan "Stok awal" dan penyesuaian stok.
--    MERCHANT_ID sudah ada dari migration multi-tenant sebelumnya.
-- ---------------------------------------------------------------------
ALTER TABLE `t_rekam_stok`
  ADD COLUMN `ID_USER` int(11) DEFAULT NULL AFTER `KETERANGAN`;

ALTER TABLE `t_rekam_stok`
  ADD INDEX `idx_trekamstok_user` (`ID_USER`);

-- ---------------------------------------------------------------------
-- 2) Tabel OTP reset password (fitur "Lupa Password").
--    - OTP_HASH : hash bcrypt dari kode OTP (tidak menyimpan plaintext).
--    - ID_USER  : akun (m_pengguna) yang akan direset.
--    - EXPIRES_AT: masa berlaku OTP (default 10 menit dari pembuatan).
--    - USED     : true setelah OTP dipakai (sekali pakai).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `m_password_reset_otp` (
  `ID`            int(11) NOT NULL AUTO_INCREMENT,
  `EMAIL`         varchar(150) DEFAULT NULL,
  `ID_USER`       int(11) DEFAULT NULL,
  `OTP_HASH`      varchar(100) DEFAULT NULL,
  `EXPIRES_AT`    datetime DEFAULT NULL,
  `LAST_SENT_AT`  datetime DEFAULT NULL,
  `ATTEMPTS`      int(11) NOT NULL DEFAULT 0,
  `USED`          tinyint(1) NOT NULL DEFAULT 0,
  `CREATED_AT`    datetime DEFAULT NULL,
  `UPDATED_AT`    datetime DEFAULT NULL,
  PRIMARY KEY (`ID`),
  KEY `idx_pwreset_email` (`EMAIL`),
  KEY `idx_pwreset_user` (`ID_USER`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- Catatan:
-- * Tidak ada perubahan yang menghapus kolom/tabel/fitur existing.
-- * Reset password admin kini menghasilkan password acak (huruf besar/kecil/
--   angka/simbol) dan disimpan sebagai hash bcrypt — tidak perlu perubahan
--   skema untuk fitur ini.
-- =====================================================================
