-- ============================================================
-- Migration 003: categories
-- DermoEczane E-Commerce
-- ============================================================

-- UP

CREATE TABLE IF NOT EXISTS `categories` (
    `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `parent_id`        BIGINT UNSIGNED DEFAULT NULL,
    `name`             VARCHAR(255)    NOT NULL,
    `slug`             VARCHAR(255)    NOT NULL,
    `description`      TEXT            DEFAULT NULL,
    `image_url`        VARCHAR(500)    DEFAULT NULL,
    `icon_url`         VARCHAR(500)    DEFAULT NULL,
    `sort_order`       INT             NOT NULL DEFAULT 0,
    `is_active`        TINYINT(1)      NOT NULL DEFAULT 1,
    `meta_title`       VARCHAR(255)    DEFAULT NULL,
    `meta_description` VARCHAR(500)    DEFAULT NULL,
    `depth`            TINYINT         NOT NULL DEFAULT 0,
    `path`             VARCHAR(500)    DEFAULT NULL,
    `created_at`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_categories_slug` (`slug`),
    KEY `idx_categories_parent_id` (`parent_id`),
    KEY `idx_categories_depth` (`depth`),
    CONSTRAINT `fk_categories_parent` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
