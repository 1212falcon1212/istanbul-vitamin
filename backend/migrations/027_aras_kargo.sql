-- ============================================================
-- Migration 027: Aras Kargo entegrasyonu
-- - orders tablosuna Aras takip kolonları
-- - aras_shipment_logs tablosu (her SOAP çağrısı için audit trail)
-- - aras_kargo grubu ayarlarını seedle (test creds dahil)
-- ============================================================

-- UP

ALTER TABLE `orders`
    ADD COLUMN `aras_integration_code` VARCHAR(32) NULL AFTER `tracking_number`,
    ADD COLUMN `aras_status_code` TINYINT NULL AFTER `delivered_at`,
    ADD COLUMN `aras_status_text` VARCHAR(64) NULL AFTER `aras_status_code`,
    ADD COLUMN `aras_status_checked_at` DATETIME NULL AFTER `aras_status_text`,
    ADD COLUMN `aras_parcel_count` TINYINT UNSIGNED NULL DEFAULT 1 AFTER `aras_status_checked_at`,
    ADD COLUMN `aras_cancel_attempted_at` DATETIME NULL AFTER `aras_parcel_count`,
    ADD COLUMN `aras_cancel_succeeded` TINYINT(1) NULL AFTER `aras_cancel_attempted_at`,
    ADD UNIQUE KEY `uniq_orders_aras_integration_code` (`aras_integration_code`),
    ADD INDEX `idx_orders_aras_poll` (`status`, `aras_status_code`, `tracking_number`);

CREATE TABLE IF NOT EXISTS `aras_shipment_logs` (
    `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `order_id`     BIGINT UNSIGNED NOT NULL,
    `op`           VARCHAR(40) NOT NULL,
    `request_xml`  MEDIUMTEXT NULL,
    `response_xml` MEDIUMTEXT NULL,
    `status_code`  VARCHAR(16) NULL,
    `error`        VARCHAR(500) NULL,
    `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_aras_logs_order` (`order_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `settings` (`key`, `value`, `group`, `created_at`, `updated_at`) VALUES
    ('aras.enabled',           'false',          'aras_kargo', NOW(), NOW()),
    ('aras.test_mode',         'true',           'aras_kargo', NOW(), NOW()),
    ('aras.username',          'neodyum',        'aras_kargo', NOW(), NOW()),
    ('aras.password',          'nd2580',         'aras_kargo', NOW(), NOW()),
    ('aras.customer_code',     '1932448851342',  'aras_kargo', NOW(), NOW()),
    ('aras.sender_address_id', '',               'aras_kargo', NOW(), NOW()),
    ('aras.payor_type_code',   '1',              'aras_kargo', NOW(), NOW()),
    ('aras.parcel_kg_limit',   '30',             'aras_kargo', NOW(), NOW()),
    -- Aras gönderici adresi için ek alanlar (contact grubuna)
    ('city',                   '',               'contact',    NOW(), NOW()),
    ('town',                   '',               'contact',    NOW(), NOW()),
    ('sender_name',            '',               'contact',    NOW(), NOW())
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), `group` = VALUES(`group`), `updated_at` = NOW();
