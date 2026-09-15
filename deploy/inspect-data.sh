#!/usr/bin/env bash
set -euo pipefail
DBPASS="$(cat /root/.kollabo/dbpass)"
export PGPASSWORD="${DBPASS}"
psql -h 127.0.0.1 -U kollabo -d kollabo <<'SQL'
SELECT 'users' AS table_name, count(*) FROM "User";
SELECT 'creator_profiles', count(*) FROM "CreatorProfile";
SELECT 'brands', count(*) FROM "Brand";
SELECT 'social_accounts', count(*) FROM "SocialAccount";
SELECT 'contracts', count(*) FROM "Contract";
SELECT 'campaigns', count(*) FROM "Campaign";
SQL
