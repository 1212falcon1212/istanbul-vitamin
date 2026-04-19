-- ============================================================
-- Migration 010: pages, sliders, banners, settings
-- DermoEczane E-Commerce
-- ============================================================

-- UP

CREATE TABLE IF NOT EXISTS `pages` (
    `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `slug`             VARCHAR(255)    NOT NULL,
    `title`            VARCHAR(255)    NOT NULL,
    `content`          LONGTEXT        DEFAULT NULL,
    `is_active`        TINYINT(1)      NOT NULL DEFAULT 1,
    `meta_title`       VARCHAR(255)    DEFAULT NULL,
    `meta_description` VARCHAR(500)    DEFAULT NULL,
    `created_at`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_pages_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `sliders` (
    `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title`            VARCHAR(255)    DEFAULT NULL,
    `subtitle`         VARCHAR(500)    DEFAULT NULL,
    `image_url`        VARCHAR(500)    NOT NULL,
    `image_url_mobile` VARCHAR(500)    DEFAULT NULL,
    `link_url`         VARCHAR(500)    DEFAULT NULL,
    `button_text`      VARCHAR(100)    DEFAULT NULL,
    `sort_order`       INT             NOT NULL DEFAULT 0,
    `is_active`        TINYINT(1)      NOT NULL DEFAULT 1,
    `starts_at`        TIMESTAMP       NULL DEFAULT NULL,
    `expires_at`       TIMESTAMP       NULL DEFAULT NULL,
    `created_at`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `banners` (
    `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `position`         VARCHAR(50)     NOT NULL,
    `title`            VARCHAR(255)    DEFAULT NULL,
    `image_url`        VARCHAR(500)    NOT NULL,
    `image_url_mobile` VARCHAR(500)    DEFAULT NULL,
    `link_url`         VARCHAR(500)    DEFAULT NULL,
    `sort_order`       INT             NOT NULL DEFAULT 0,
    `is_active`        TINYINT(1)      NOT NULL DEFAULT 1,
    `starts_at`        TIMESTAMP       NULL DEFAULT NULL,
    `expires_at`       TIMESTAMP       NULL DEFAULT NULL,
    `created_at`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_banners_position_active` (`position`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `settings` (
    `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `key`         VARCHAR(100)    NOT NULL,
    `value`       TEXT            DEFAULT NULL,
    `group`       VARCHAR(50)     NOT NULL DEFAULT 'general',
    `updated_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_settings_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
