#!/usr/bin/env bash
set -euo pipefail
DBPASS="$(cat /root/.kollabo/dbpass)"
export PGPASSWORD="${DBPASS}"
psql -h 127.0.0.1 -U kollabo -d kollabo -c 'SELECT u.email, u.name, cp.slug FROM "User" u LEFT JOIN "CreatorProfile" cp ON cp."userId" = u.id;'
