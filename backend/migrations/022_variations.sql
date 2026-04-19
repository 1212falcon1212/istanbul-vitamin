-- ============================================================
-- Migration 022: Varyasyon türleri ve değerleri
-- variation_types:  "Renk", "Beden", "Aroma" gibi üst kategori
-- variation_values: "Kırmızı", "S", "Vanilya" gibi değerler
-- product_variant_values: ProductVariant'ın hangi değerleri içerdiği (M2M)
-- ============================================================

-- UP

CREATE TABLE IF NOT EXISTS `variation_types` (
    `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name`       VARCHAR(100)    NOT NULL,
    `slug`       VARCHAR(120)    NOT NULL,
    `sort_order` INT             NOT NULL DEFAULT 0,
    `is_active`  TINYINT(1)      NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_variation_types_slug` (`slug`),
    KEY `idx_variation_types_active` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `variation_values` (
    `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `variation_type_id` BIGINT UNSIGNED NOT NULL,
    `value`             VARCHAR(150)    NOT NULL,
    `slug`              VARCHAR(170)    NOT NULL,
    `color_hex`         VARCHAR(7)      DEFAULT NULL,   -- renk tipi için "#RRGGBB"
    `sort_order`        INT             NOT NULL DEFAULT 0,
    `is_active`         TINYINT(1)      NOT NULL DEFAULT 1,
    `created_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_variation_values_type_slug` (`variation_type_id`, `slug`),
    KEY `idx_variation_values_type` (`variation_type_id`, `sort_order`),
    CONSTRAINT `fk_variation_values_type`
        FOREIGN KEY (`variation_type_id`) REFERENCES `variation_types` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ProductVariant ↔ VariationValue bağlayıcı tablosu.
-- Bir variant birden fazla değer içerebilir: ör. "Kırmızı + S"
CREATE TABLE IF NOT EXISTS `product_variant_values` (
    `variant_id`          BIGINT UNSIGNED NOT NULL,
    `variation_value_id`  BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (`variant_id`, `variation_value_id`),
    KEY `idx_pvv_value` (`variation_value_id`),
    CONSTRAINT `fk_pvv_variant`
        FOREIGN KEY (`variant_id`)         REFERENCES `product_variants` (`id`)   ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_pvv_value`
        FOREIGN KEY (`variation_value_id`) REFERENCES `variation_values` (`id`)   ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
