#!/bin/sh
set -eu

DB_PATH="${FB_DATABASE:-/database/filebrowser.db}"
ROOT_PATH="${FB_ROOT:-/srv}"
BASE_URL="${FB_BASEURL:-/files}"
ADDRESS="${FB_ADDRESS:-0.0.0.0}"
PORT="${FB_PORT:-8080}"
ADMIN_USERNAME="${FILEBROWSER_ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${FILEBROWSER_ADMIN_PASSWORD:-}"

mkdir -p "$(dirname "$DB_PATH")"

if [ ! -f "$DB_PATH" ]; then
  if [ -z "$ADMIN_PASSWORD" ]; then
    echo "FILEBROWSER_ADMIN_PASSWORD is required on first startup" >&2
    exit 1
  fi

  PASSWORD_HASH="$(filebrowser hash "$ADMIN_PASSWORD")"
  exec filebrowser \
    -d "$DB_PATH" \
    -r "$ROOT_PATH" \
    -b "$BASE_URL" \
    -a "$ADDRESS" \
    -p "$PORT" \
    --username "$ADMIN_USERNAME" \
    --password "$PASSWORD_HASH"
fi

exec filebrowser \
  -d "$DB_PATH" \
  -r "$ROOT_PATH" \
  -b "$BASE_URL" \
  -a "$ADDRESS" \
  -p "$PORT"
