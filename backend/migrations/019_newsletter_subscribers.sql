-- Migration 019: newsletter_subscribers
-- Bülten aboneleri ve unsubscribe token'ları

CREATE TABLE IF NOT EXISTS `newsletter_subscribers` (
    `id`                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `email`              VARCHAR(255)    NOT NULL,
    `unsubscribe_token`  VARCHAR(64)     NOT NULL,
    `is_active`          TINYINT(1)      NOT NULL DEFAULT 1,
    `subscribed_at`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `unsubscribed_at`    TIMESTAMP       NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_newsletter_email` (`email`),
    UNIQUE KEY `uk_newsletter_token` (`unsubscribe_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
