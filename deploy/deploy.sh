#!/usr/bin/env bash
# istanbul-vitamin — production deploy script
# Runs on the VPS as the `istanbulvitamin` user. Webhook invokes it.
# Idempotent and safe to re-run.

set -euo pipefail

# ---- config (override with env vars in /etc/istanbulvitamin-webhook.env) ----
REPO_DIR="${REPO_DIR:-/home/istanbulvitamin/htdocs/istanbulvitamin.com/app}"
BRANCH="${BRANCH:-main}"
BACKEND_DIR="${BACKEND_DIR:-$REPO_DIR/backend}"
FRONTEND_DIR="${FRONTEND_DIR:-$REPO_DIR/frontend}"
BACKEND_SERVICE="${BACKEND_SERVICE:-istanbulvitamin-api}"
PM2_FRONTEND_NAME="${PM2_FRONTEND_NAME:-istanbulvitamin-web}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-true}"
SKIP_BACKEND="${SKIP_BACKEND:-false}"
SKIP_FRONTEND="${SKIP_FRONTEND:-false}"
GO_BIN="${GO_BIN:-/usr/local/go/bin/go}"

log()  { printf '\e[1;34m[deploy]\e[0m %s\n' "$*"; }
warn() { printf '\e[1;33m[deploy]\e[0m %s\n' "$*" >&2; }
die()  { printf '\e[1;31m[deploy]\e[0m %s\n' "$*" >&2; exit 1; }

START_TS=$(date +%s)
log "starting deploy @ $(date -Iseconds)"

[[ -d "$REPO_DIR/.git" ]] || die "repo not found at $REPO_DIR"
cd "$REPO_DIR"

# ---- 1. git pull ----
log "fetching $BRANCH from origin"
git fetch --quiet origin "$BRANCH"

LOCAL_SHA=$(git rev-parse HEAD)
REMOTE_SHA=$(git rev-parse "origin/$BRANCH")

if [[ "$LOCAL_SHA" == "$REMOTE_SHA" ]]; then
  log "already up to date ($LOCAL_SHA) — nothing to deploy"
  exit 0
fi

log "updating $LOCAL_SHA → $REMOTE_SHA"
git reset --hard "origin/$BRANCH"

CHANGED=$(git diff --name-only "$LOCAL_SHA" "$REMOTE_SHA" || echo "")
BACKEND_CHANGED=false
FRONTEND_CHANGED=false
grep -q '^backend/' <<<"$CHANGED" && BACKEND_CHANGED=true
grep -q '^frontend/' <<<"$CHANGED" && FRONTEND_CHANGED=true

# ---- 2. backend ----
if [[ "$SKIP_BACKEND" != "true" && "$BACKEND_CHANGED" == "true" ]]; then
  log "building backend (Go)"
  cd "$BACKEND_DIR"
  "$GO_BIN" build -o bin/server ./cmd/server

  if [[ "$RUN_MIGRATIONS" == "true" ]]; then
    log "applying new migrations"
    bash "$REPO_DIR/deploy/migrate.sh"
  fi

  log "restarting $BACKEND_SERVICE"
  sudo /bin/systemctl restart "$BACKEND_SERVICE"
  cd "$REPO_DIR"
else
  log "backend unchanged — skipping"
fi

# ---- 3. frontend ----
if [[ "$SKIP_FRONTEND" != "true" && "$FRONTEND_CHANGED" == "true" ]]; then
  log "building frontend (Next.js)"
  cd "$FRONTEND_DIR"

  if grep -qE '^frontend/(package\.json|package-lock\.json)$' <<<"$CHANGED"; then
    log "installing deps (lockfile changed)"
    npm ci --no-audit --no-fund
  fi

  npm run build

  log "restarting pm2 process $PM2_FRONTEND_NAME"
  sudo /usr/bin/pm2 restart "$PM2_FRONTEND_NAME" --update-env
  cd "$REPO_DIR"
else
  log "frontend unchanged — skipping"
fi

ELAPSED=$(( $(date +%s) - START_TS ))
log "deploy complete in ${ELAPSED}s → $(git rev-parse --short HEAD)"
