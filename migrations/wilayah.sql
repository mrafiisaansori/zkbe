-- =====================================================================
-- MIGRASI: Referensi WILAYAH (Provinsi & Kota/Kabupaten) untuk dropdown
-- registrasi merchant. Jalankan manual di database POS.
-- =====================================================================

-- 1) Tabel referensi (ID = kode BPS).
CREATE TABLE IF NOT EXISTS `m_provinsi` (
  `ID` varchar(2) NOT NULL,
  `NAMA` varchar(100) NOT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

CREATE TABLE IF NOT EXISTS `m_kota` (
  `ID` varchar(5) NOT NULL,
  `PROVINSI_ID` varchar(2) NOT NULL,
  `NAMA` varchar(100) NOT NULL,
  PRIMARY KEY (`ID`),
  KEY `idx_kota_provinsi` (`PROVINSI_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- 2) Seed 38 PROVINSI (kode BPS, termasuk 4 provinsi baru Papua 2022).
INSERT INTO `m_provinsi` (`ID`, `NAMA`) VALUES
('11','ACEH'),
('12','SUMATERA UTARA'),
('13','SUMATERA BARAT'),
('14','RIAU'),
('15','JAMBI'),
('16','SUMATERA SELATAN'),
('17','BENGKULU'),
('18','LAMPUNG'),
('19','KEPULAUAN BANGKA BELITUNG'),
('21','KEPULAUAN RIAU'),
('31','DKI JAKARTA'),
('32','JAWA BARAT'),
('33','JAWA TENGAH'),
('34','DI YOGYAKARTA'),
('35','JAWA TIMUR'),
('36','BANTEN'),
('51','BALI'),
('52','NUSA TENGGARA BARAT'),
('53','NUSA TENGGARA TIMUR'),
('61','KALIMANTAN BARAT'),
('62','KALIMANTAN TENGAH'),
('63','KALIMANTAN SELATAN'),
('64','KALIMANTAN TIMUR'),
('65','KALIMANTAN UTARA'),
('71','SULAWESI UTARA'),
('72','SULAWESI TENGAH'),
('73','SULAWESI SELATAN'),
('74','SULAWESI TENGGARA'),
('75','GORONTALO'),
('76','SULAWESI BARAT'),
('81','MALUKU'),
('82','MALUKU UTARA'),
('91','PAPUA'),
('92','PAPUA BARAT'),
('93','PAPUA SELATAN'),
('94','PAPUA TENGAH'),
('95','PAPUA PEGUNUNGAN'),
('96','PAPUA BARAT DAYA')
ON DUPLICATE KEY UPDATE `NAMA` = VALUES(`NAMA`);

-- 3) DATA KOTA/KABUPATEN (~514 baris) — IMPORT dari sumber resmi.
--    Pilih salah satu opsi:
--
--    OPSI A (paling update, Kepmendagri 2025) — repo cahyadsn/wilayah:
--      https://github.com/cahyadsn/wilayah
--      Repo ini punya 1 tabel `wilayah(kode, nama)`. Setelah diimpor,
--      isi m_provinsi & m_kota dengan query transform berikut:
--
--      INSERT INTO m_provinsi (ID, NAMA)
--        SELECT kode, nama FROM wilayah WHERE kode REGEXP '^[0-9]{2}$'
--        ON DUPLICATE KEY UPDATE NAMA = VALUES(NAMA);
--
--      INSERT INTO m_kota (ID, PROVINSI_ID, NAMA)
--        SELECT REPLACE(kode,'.',''), SUBSTRING_INDEX(kode,'.',1), nama
--        FROM wilayah WHERE kode REGEXP '^[0-9]{2}\\.[0-9]{2}$'
--        ON DUPLICATE KEY UPDATE NAMA = VALUES(NAMA);
--
--    OPSI B (CSV siap pakai, skema cocok langsung) — repo edwardsamuel:
--      https://github.com/edwardsamuel/Wilayah-Administratif-Indonesia
--      File csv/provinces.csv  (id,name)             -> m_provinsi (ID, NAMA)
--      File csv/regencies.csv  (id,province_id,name) -> m_kota (ID, PROVINSI_ID, NAMA)
--      Catatan: dataset ini berbasis 34 provinsi (4 provinsi Papua baru
--      mungkin belum ada kotanya). Untuk kelengkapan terbaru, pakai OPSI A.
--
--    OPSI C — API publik emsifa (skema id/province_id sama dengan m_kota):
--      https://www.emsifa.com/api-wilayah-indonesia/
--
-- Selama tabel m_kota belum diisi, dropdown Provinsi tetap jalan;
-- dropdown Kota baru muncul setelah data kota diimpor.
