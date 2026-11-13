CREATE TABLE IF NOT EXISTS push_subscriptions (
 device_hash VARCHAR(64) PRIMARY KEY,
 token TEXT NOT NULL,
 updated_at DATETIME(3) NOT NULL,
 INDEX idx_push_updated_at (updated_at)
);
