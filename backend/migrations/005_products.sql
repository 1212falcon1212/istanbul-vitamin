-- ============================================================
-- Migration 005: products, product_categories, product_images,
--                product_variants, product_tags
-- DermoEczane E-Commerce
-- ============================================================

-- UP

CREATE TABLE IF NOT EXISTS `products` (
    `id`                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `brand_id`            BIGINT UNSIGNED DEFAULT NULL,
    `sku`                 VARCHAR(100)    NOT NULL,
    `barcode`             VARCHAR(100)    DEFAULT NULL,
    `name`                VARCHAR(500)    NOT NULL,
    `slug`                VARCHAR(500)    NOT NULL,
    `short_description`   TEXT            DEFAULT NULL,
    `description`         LONGTEXT        DEFAULT NULL,
    `price`               DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    `compare_price`       DECIMAL(10,2)   DEFAULT NULL,
    `cost_price`          DECIMAL(10,2)   DEFAULT NULL,
    `currency`            VARCHAR(5)      NOT NULL DEFAULT 'TRY',
    `stock`               INT             NOT NULL DEFAULT 0,
    `low_stock_threshold` INT             NOT NULL DEFAULT 5,
    `weight`              DECIMAL(8,3)    DEFAULT NULL,
    `is_active`           TINYINT(1)      NOT NULL DEFAULT 1,
    `is_featured`         TINYINT(1)      NOT NULL DEFAULT 0,
    `is_campaign`         TINYINT(1)      NOT NULL DEFAULT 0,
    `tax_rate`            DECIMAL(5,2)    NOT NULL DEFAULT 20.00,
    `trendyol_id`         VARCHAR(100)    DEFAULT NULL,
    `trendyol_barcode`    VARCHAR(100)    DEFAULT NULL,
    `hepsiburada_id`      VARCHAR(100)    DEFAULT NULL,
    `hepsiburada_sku`     VARCHAR(100)    DEFAULT NULL,
    `meta_title`          VARCHAR(255)    DEFAULT NULL,
    `meta_description`    VARCHAR(500)    DEFAULT NULL,
    `feed_source_id`      VARCHAR(100)    DEFAULT NULL,
    `view_count`          INT UNSIGNED    NOT NULL DEFAULT 0,
    `sold_count`          INT UNSIGNED    NOT NULL DEFAULT 0,
    `created_at`          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_products_sku` (`sku`),
    UNIQUE KEY `uk_products_slug` (`slug`),
    KEY `idx_products_brand_id` (`brand_id`),
    KEY `idx_products_active_featured` (`is_active`, `is_featured`),
    KEY `idx_products_price` (`price`),
    FULLTEXT KEY `ft_products_name_desc` (`name`, `short_description`),
    CONSTRAINT `fk_products_brand` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `product_categories` (
    `product_id`  BIGINT UNSIGNED NOT NULL,
    `category_id` BIGINT UNSIGNED NOT NULL,
    `is_primary`  TINYINT(1)      NOT NULL DEFAULT 0,
    PRIMARY KEY (`product_id`, `category_id`),
    KEY `idx_pc_category_id` (`category_id`),
    CONSTRAINT `fk_pc_product`  FOREIGN KEY (`product_id`)  REFERENCES `products` (`id`)   ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_pc_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `product_images` (
    `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `product_id`  BIGINT UNSIGNED NOT NULL,
    `image_url`   VARCHAR(500)    NOT NULL,
    `alt_text`    VARCHAR(255)    DEFAULT NULL,
    `sort_order`  INT             NOT NULL DEFAULT 0,
    `is_primary`  TINYINT(1)      NOT NULL DEFAULT 0,
    `created_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_product_images_product_id` (`product_id`),
    CONSTRAINT `fk_product_images_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `product_variants` (
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `product_id`    BIGINT UNSIGNED NOT NULL,
    `name`          VARCHAR(255)    NOT NULL,
    `sku`           VARCHAR(100)    DEFAULT NULL,
    `barcode`       VARCHAR(100)    DEFAULT NULL,
    `price`         DECIMAL(10,2)   DEFAULT NULL,
    `compare_price` DECIMAL(10,2)   DEFAULT NULL,
    `stock`         INT             NOT NULL DEFAULT 0,
    `is_active`     TINYINT(1)      NOT NULL DEFAULT 1,
    `sort_order`    INT             NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_product_variants_product_id` (`product_id`),
    CONSTRAINT `fk_product_variants_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `product_tags` (
    `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `product_id`  BIGINT UNSIGNED NOT NULL,
    `tag`         VARCHAR(100)    NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_product_tags_product_id` (`product_id`),
    KEY `idx_product_tags_tag` (`tag`),
    CONSTRAINT `fk_product_tags_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
