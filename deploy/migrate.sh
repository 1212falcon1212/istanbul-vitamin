#!/usr/bin/env bash
# Apply any new SQL migrations under backend/migrations.
# Tracks applied files in a `schema_migrations` table so each runs once.

set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/istanbul-vitamin}"
MIGRATIONS_DIR="$REPO_DIR/backend/migrations"

# DB creds are read from backend/.env (KEY=VALUE lines).
# shellcheck disable=SC1091
set -a
source "$REPO_DIR/backend/.env"
set +a

MYSQL_CMD=(mysql
  --host="${DB_HOST:-localhost}"
  --port="${DB_PORT:-3306}"
  --user="${DB_USER:-root}"
  "${DB_NAME}"
)
if [[ -n "${DB_PASSWORD:-}" ]]; then
  export MYSQL_PWD="$DB_PASSWORD"
fi

log() { printf '\e[1;34m[migrate]\e[0m %s\n' "$*"; }

"${MYSQL_CMD[@]}" -e "
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;"

APPLIED=$("${MYSQL_CMD[@]}" -Nse "SELECT filename FROM schema_migrations;")

shopt -s nullglob
for f in "$MIGRATIONS_DIR"/*.sql; do
  name=$(basename "$f")
  if grep -qxF "$name" <<<"$APPLIED"; then
    continue
  fi
  log "applying $name"
  "${MYSQL_CMD[@]}" < "$f"
  "${MYSQL_CMD[@]}" -e "INSERT INTO schema_migrations (filename) VALUES ('$name');"
done

log "all migrations applied"
