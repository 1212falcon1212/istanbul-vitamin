-- Migration 018: email_verifications
-- Register sonrası gönderilen e-posta doğrulama token'larını saklar.

CREATE TABLE IF NOT EXISTS `email_verifications` (
    `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`     BIGINT UNSIGNED NOT NULL,
    `token_hash`  VARCHAR(255)    NOT NULL,
    `expires_at`  TIMESTAMP       NOT NULL,
    `verified_at` TIMESTAMP       NULL DEFAULT NULL,
    `created_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_email_verifications_user` (`user_id`),
    INDEX `idx_email_verifications_token` (`token_hash`),
    CONSTRAINT `fk_email_verifications_user`
        FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
