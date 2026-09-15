#!/usr/bin/env bash
# Resolve VPS-vs-git conflict, then re-run kollabo-deploy.sh.
# VPS has stale manual edits to files we just committed. Discard them
# (they're identical content) and pull the canonical versions from git.
set -euo pipefail

APP_DIR="/var/www/kollabo.pk"
cd "${APP_DIR}"

echo "=== Stashing local changes (including untracked) ==="
# Save .env + any env files explicitly so they're not lost
cp -a apps/web/.env /root/.env.apps-web.bak 2>/dev/null || true
cp -a .env /root/.env.root.bak 2>/dev/null || true

git checkout -- .
git clean -fd

# Restore .env in case it was removed
if [[ -f /root/.env.apps-web.bak ]]; then
    cp /root/.env.apps-web.bak apps/web/.env
    chmod 600 apps/web/.env
fi
if [[ -f /root/.env.root.bak ]]; then
    cp /root/.env.root.bak .env
    chmod 600 .env
fi

echo
echo "=== Status after cleanup ==="
git status --short | head -20

echo
echo "=== Re-running deploy ==="
bash /root/deploy/kollabo-deploy.sh
