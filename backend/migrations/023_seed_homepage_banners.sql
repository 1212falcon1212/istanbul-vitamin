-- ============================================================
-- Migration 023: Anasayfa banner seed (slider bannerlara birleştirildi)
-- Tüm anasayfa görselleri artık tek `banners` tablosundan yönetilir.
-- Konumlar:
--   hero       → üst büyük slider (birden fazla olabilir, otomatik dönüşür)
--   hero_tile  → hero altı 3'lü küçük tile
--   seasonal   → sezon banner (tek, büyük yatay)
--   mid        → orta banner (çift)
--   footer     → alt büyük final banner
-- ============================================================

-- UP

-- 1) Eski placeholder sliderları boşalt (artık kullanılmıyor).
DELETE FROM `sliders`;

-- 2) Anasayfa banner'ları — boşaltıp yeniden seed et.
DELETE FROM `banners`;

INSERT INTO `banners` (`position`, `title`, `image_url`, `image_url_mobile`, `link_url`, `sort_order`, `is_active`, `created_at`, `updated_at`) VALUES
-- Üst büyük slider (3 görsel dönüşümlü)
('hero',      'Papatya Özlü Bioderma',   '/banners/papatya-slider-bioderma4-tr-335.jpg', '/banners/mobil-papatya-ducray13-tr-22.jpg',  '/markalar/bioderma',       1, 1, NOW(), NOW()),
('hero',      'Hediyeli Avène',          '/banners/slider-hediyeli-avene13-tr-320.jpg',   '/banners/mobil-hediyeli-bioxcin-tr-27.jpg',  '/markalar/avene',          2, 1, NOW(), NOW()),
('hero',      'Hediyeli Vichy',          '/banners/slider-hediyeli-vichy-tr-217.jpg',    '/banners/mobil-hediyeli-bioxcin-tr-27.jpg',  '/markalar/vichy',          3, 1, NOW(), NOW()),

-- Hero altı 3'lü tile
('hero_tile', 'Idea Derma',              '/banners/idea-derma-mobil6-tr-22.jpg',         NULL, '/markalar',                1, 1, NOW(), NOW()),
('hero_tile', '1 Nisan Fırsatları',      '/banners/alls-mobil-1nisan-tr-21.jpg',         NULL, '/kampanyalar',             2, 1, NOW(), NOW()),
('hero_tile', 'Marc Anthony Festival',   '/banners/marc-anthony-festival-roller-mobil-tr-8.jpg', NULL, '/markalar/marc-anthony', 3, 1, NOW(), NOW()),

-- Orta seasonal ve dual
('seasonal',  'Sezonun Favorileri',      '/banners/idea-derma-mobil6-tr-22.jpg',         NULL, '/kampanyalar',             1, 1, NOW(), NOW()),
('mid',       'Natural Bakım',           '/banners/from-natura-mobil5-tr-20.jpg',        NULL, '/markalar',                2, 1, NOW(), NOW()),

-- Alt büyük final banner
('footer',    'Tüm Markalar',            '/banners/alls-mobil-1nisan-tr-21.jpg',         NULL, '/markalar',                3, 1, NOW(), NOW());
