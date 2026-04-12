#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

compose="docker compose -f docker-compose.release.yml"

echo "Pulling MacroMetric release images..."
$compose pull

echo "Starting MacroMetric release stack..."
$compose up -d

echo "Checking MacroMetric health..."
if command -v curl >/dev/null 2>&1; then
  curl -fsS http://127.0.0.1/api/health >/dev/null
else
  wget -qO- http://127.0.0.1/api/health >/dev/null
fi

$compose ps
echo "MacroMetric release is running."
