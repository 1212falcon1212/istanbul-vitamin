-- For installations using SQL migrations instead of GORM AutoMigrate.
ALTER TABLE users ADD COLUMN google_subject VARCHAR(255) NULL;
CREATE UNIQUE INDEX idx_users_google_subject ON users (google_subject);
