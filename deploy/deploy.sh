#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/saved-lists-cleaner/app}"
BRANCH="${BRANCH:-main}"

cd "$APP_DIR"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"
docker compose --env-file .env.production up -d --build
docker image prune -f >/dev/null 2>&1 || true
