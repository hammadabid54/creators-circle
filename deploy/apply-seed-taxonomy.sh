#!/usr/bin/env bash
# Apply taxonomy seed to production Postgres.
set -euo pipefail

DBPASS="$(cat /root/.kollabo/dbpass)"
export PGPASSWORD="${DBPASS}"

SQL_FILE="${1:-/root/deploy/seed-taxonomy.sql}"

echo "=== Before: counts by kind ==="
psql -h 127.0.0.1 -U kollabo -d kollabo -c "SELECT kind, count(*) FROM \"DiscoveryTaxon\" WHERE enabled=true GROUP BY kind ORDER BY kind;"

echo
echo "=== Applying ${SQL_FILE} ==="
psql -h 127.0.0.1 -U kollabo -d kollabo -v ON_ERROR_STOP=1 -f "${SQL_FILE}"

echo
echo "=== After: counts by kind ==="
psql -h 127.0.0.1 -U kollabo -d kollabo -c "SELECT kind, count(*) FROM \"DiscoveryTaxon\" WHERE enabled=true GROUP BY kind ORDER BY kind;"

echo
echo "=== Spot check: cities ==="
psql -h 127.0.0.1 -U kollabo -d kollabo -c "SELECT label FROM \"DiscoveryTaxon\" WHERE kind='city' ORDER BY label;"
