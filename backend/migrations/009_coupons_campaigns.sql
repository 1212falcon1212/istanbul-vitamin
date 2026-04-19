-- ============================================================
-- Migration 009: coupons, campaigns, campaign_products
-- DermoEczane E-Commerce
-- ============================================================

-- UP

CREATE TABLE IF NOT EXISTS `coupons` (
    `id`                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code`               VARCHAR(50)     NOT NULL,
    `description`        TEXT            DEFAULT NULL,
    `discount_type`      ENUM('percentage','fixed') NOT NULL DEFAULT 'percentage',
    `discount_value`     DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    `min_order_amount`   DECIMAL(10,2)   DEFAULT NULL,
    `max_discount_amount` DECIMAL(10,2)  DEFAULT NULL,
    `usage_limit`        INT UNSIGNED    DEFAULT NULL,
    `usage_count`        INT UNSIGNED    NOT NULL DEFAULT 0,
    `per_user_limit`     INT UNSIGNED    DEFAULT NULL,
    `starts_at`          TIMESTAMP       NULL DEFAULT NULL,
    `expires_at`         TIMESTAMP       NULL DEFAULT NULL,
    `is_active`          TINYINT(1)      NOT NULL DEFAULT 1,
    `created_at`         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_coupons_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `campaigns` (
    `id`                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name`                 VARCHAR(255)    NOT NULL,
    `slug`                 VARCHAR(255)    NOT NULL,
    `description`          TEXT            DEFAULT NULL,
    `banner_image`         VARCHAR(500)    DEFAULT NULL,
    `banner_image_mobile`  VARCHAR(500)    DEFAULT NULL,
    `discount_type`        ENUM('percentage','fixed') NOT NULL DEFAULT 'percentage',
    `discount_value`       DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    `starts_at`            TIMESTAMP       NULL DEFAULT NULL,
    `expires_at`           TIMESTAMP       NULL DEFAULT NULL,
    `is_active`            TINYINT(1)      NOT NULL DEFAULT 1,
    `meta_title`           VARCHAR(255)    DEFAULT NULL,
    `meta_description`     VARCHAR(500)    DEFAULT NULL,
    `created_at`           TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`           TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_campaigns_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `campaign_products` (
    `campaign_id` BIGINT UNSIGNED NOT NULL,
    `product_id`  BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (`campaign_id`, `product_id`),
    KEY `idx_cp_product_id` (`product_id`),
    CONSTRAINT `fk_cp_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_cp_product`  FOREIGN KEY (`product_id`)  REFERENCES `products` (`id`)  ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
