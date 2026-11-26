CREATE TRIGGER IF NOT EXISTS users_invalidate_sessions BEFORE UPDATE ON users
FOR EACH ROW SET NEW.session_version = OLD.session_version + IF(
    BINARY OLD.password_hash <> BINARY NEW.password_hash OR OLD.is_active <> NEW.is_active, 1, 0
);
CREATE TRIGGER IF NOT EXISTS admins_invalidate_sessions BEFORE UPDATE ON admins
FOR EACH ROW SET NEW.session_version = OLD.session_version + IF(
    BINARY OLD.password_hash <> BINARY NEW.password_hash OR OLD.is_active <> NEW.is_active OR OLD.role <> NEW.role, 1, 0
);
