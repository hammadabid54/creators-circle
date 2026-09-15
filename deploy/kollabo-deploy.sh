#!/usr/bin/env bash
# Kollabo deploy: pull, install, build, restart PM2.
# Run from /root on the VPS: bash /root/deploy/kollabo-deploy.sh
set -euo pipefail

APP_DIR="/var/www/kollabo.pk"
cd "${APP_DIR}"

echo "=== [1/6] git fetch + status ==="
git fetch origin
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/feat/brand-direct-hire")
echo "  local:  $LOCAL"
echo "  remote: $REMOTE"

if [[ "$LOCAL" == "$REMOTE" ]]; then
    echo "  Already up to date. Nothing to pull."
else
    echo "  Pulling..."
    git pull --ff-only origin feat/brand-direct-hire
fi

echo
echo "=== [2/6] pnpm install (frozen lockfile) ==="
pnpm install --frozen-lockfile

echo
echo "=== [3/6] Prisma generate ==="
cd "${APP_DIR}/apps/web"
pnpm prisma generate 2>&1 | tail -5

echo
echo "=== [4/6] pnpm build ==="
pnpm build 2>&1 | tail -30

echo
echo "=== [5/6] Restart PM2 (graceful reload) ==="
cd "${APP_DIR}"
pm2 reload kollabo 2>&1 || pm2 restart kollabo 2>&1

echo
echo "=== [6/6] Health check ==="
sleep 3
HTTP_STATUS=$(curl -sk -o /dev/null -w '%{http_code}' https://kollabo.pk 2>&1 || echo "ERR")
HTTP_HOME=$(curl -sk -o /dev/null -w '%{http_code}' https://kollabo.pk/signin 2>&1 || echo "ERR")
HTTP_TERMS=$(curl -sk -o /dev/null -w '%{http_code}' https://kollabo.pk/terms 2>&1 || echo "ERR")
HTTP_PRIV=$(curl -sk -o /dev/null -w '%{http_code}' https://kollabo.pk/privacy 2>&1 || echo "ERR")
echo "  /         -> ${HTTP_STATUS}"
echo "  /signin   -> ${HTTP_HOME}"
echo "  /terms    -> ${HTTP_TERMS}"
echo "  /privacy  -> ${HTTP_PRIV}"

pm2 list | grep -E 'kollabo|omni' || true

echo
echo "=== Done ==="
