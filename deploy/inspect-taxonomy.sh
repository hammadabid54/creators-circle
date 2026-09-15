#!/usr/bin/env bash
# Quick taxonomy inspection on production.
set -euo pipefail

DBPASS="$(cat /root/.kollabo/dbpass)"

echo "=== Counts by kind (enabled=true) ==="
PGPASSWORD="${DBPASS}" psql -h 127.0.0.1 -U kollabo -d kollabo -c "SELECT kind, count(*) FROM \"DiscoveryTaxon\" WHERE enabled=true GROUP BY kind ORDER BY kind;"

echo
echo "=== Sample city taxa (enabled=true) ==="
PGPASSWORD="${DBPASS}" psql -h 127.0.0.1 -U kollabo -d kollabo -c "SELECT id, kind, value, label FROM \"DiscoveryTaxon\" WHERE kind='city' LIMIT 10;"

echo
echo "=== Total DiscoveryTaxon rows by enabled status ==="
PGPASSWORD="${DBPASS}" psql -h 127.0.0.1 -U kollabo -d kollabo -c "SELECT enabled, count(*) FROM \"DiscoveryTaxon\" GROUP BY enabled ORDER BY enabled;"
