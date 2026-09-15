#!/usr/bin/env bash
set -euo pipefail
DBPASS="$(cat /root/.kollabo/dbpass)"
export PGPASSWORD="${DBPASS}"
psql -h 127.0.0.1 -U kollabo -d kollabo -c "\\d \"DiscoveryTaxon\""
