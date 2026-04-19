-- ============================================================
-- Migration 012: Seed default settings
-- DermoEczane E-Commerce
-- ============================================================

-- UP

INSERT INTO `settings` (`key`, `value`, `group`) VALUES
    -- General
    ('site_name', 'DermoEczane', 'general'),
    -- Contact
    ('phone', '', 'contact'),
    ('email', '', 'contact'),
    ('address', '', 'contact'),
    ('whatsapp_number', '', 'contact'),
    -- Social
    ('instagram', '', 'social'),
    ('facebook', '', 'social'),
    ('twitter', '', 'social'),
    ('youtube', '', 'social'),
    -- SEO
    ('meta_title', 'DermoEczane — Dermokozmetik Ürünleri', 'seo'),
    ('meta_description', 'DermoEczane ile dermokozmetik ürünlerini en uygun fiyatlarla satın alın.', 'seo'),
    ('google_analytics_id', '', 'seo'),
    -- Shipping
    ('min_free_shipping', '500', 'shipping'),
    ('default_cargo_fee', '39.90', 'shipping')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
