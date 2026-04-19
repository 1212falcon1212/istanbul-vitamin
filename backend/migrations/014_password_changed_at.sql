-- Migration 014: users.password_changed_at
-- Şifre değişince eski JWT'lerin geçersiz olmasını sağlar.
-- JWT'nin `iat` claim'i bu zamandan küçükse token reddedilir.

ALTER TABLE `users`
    ADD COLUMN `password_changed_at` TIMESTAMP NULL DEFAULT NULL AFTER `password_hash`;

ALTER TABLE `admins`
    ADD COLUMN `password_changed_at` TIMESTAMP NULL DEFAULT NULL AFTER `password_hash`;
