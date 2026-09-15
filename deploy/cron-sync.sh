#!/bin/bash
# Cron job for Kollabo social-sync endpoint.
# Called every 6 hours via system crontab.
set -e
cd /var/www/kollabo.pk/apps/web

# Source env (CRON_SECRET, etc.) from .env
if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

if [ -z "$CRON_SECRET" ]; then
  echo "[$(date -Iseconds)] CRON_SECRET missing from .env" >> /var/log/kollabo/cron.log
  exit 1
fi

echo "[$(date -Iseconds)] sync-social starting" >> /var/log/kollabo/cron.log
curl -sS -m 60 -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  http://127.0.0.1:3001/api/cron/sync-social \
  >> /var/log/kollabo/cron.log 2>&1
echo "" >> /var/log/kollabo/cron.log
