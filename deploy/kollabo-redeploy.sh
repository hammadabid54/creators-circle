#!/usr/bin/env bash
# Quick re-deploy after a schema fix: pull, regenerate Prisma client,
# rebuild, restart PM2, verify.
set -euo pipefail

APP_DIR="/var/www/kollabo.pk"
cd "${APP_DIR}"

echo "=== Pull ==="
git pull --ff-only origin feat/brand-direct-hire

echo
echo "=== Prisma generate (regenerate client for postgresql) ==="
cd "${APP_DIR}/apps/web"
pnpm prisma generate 2>&1 | tail -3

echo
echo "=== Build ==="
pnpm build 2>&1 | tail -15

echo
echo "=== Restart PM2 ==="
cd "${APP_DIR}"
pm2 reload kollabo 2>&1 || pm2 restart kollabo 2>&1

echo
echo "=== Health check ==="
sleep 3
echo "  /         -> $(curl -sk -o /dev/null -w '%{http_code}' https://kollabo.pk 2>&1)"
echo "  /signin   -> $(curl -sk -o /dev/null -w '%{http_code}' https://kollabo.pk/signin 2>&1)"
echo "  /terms    -> $(curl -sk -o /dev/null -w '%{http_code}' https://kollabo.pk/terms 2>&1)"
echo "  /privacy  -> $(curl -sk -o /dev/null -w '%{http_code}' https://kollabo.pk/privacy 2>&1)"
echo "  /creators -> $(curl -sk -o /dev/null -w '%{http_code}' https://kollabo.pk/creators 2>&1)"
echo "  /discover -> $(curl -sk -o /dev/null -w '%{http_code}' https://kollabo.pk/discover 2>&1)"

pm2 list | grep kollabo || true
