#!/usr/bin/env bash
set -euo pipefail
DBPASS="$(cat /root/.kollabo/dbpass)"
export PGPASSWORD="${DBPASS}"
psql -h 127.0.0.1 -U kollabo -d kollabo <<'SQL'
SELECT u.email, u.name, u.id as user_id, cp.id as profile_id, cp.slug, cp.displayName, cp.city, cp.isPublished
FROM "User" u
LEFT JOIN "CreatorProfile" cp ON cp."userId" = u.id
ORDER BY u."createdAt" DESC
LIMIT 5;

SELECT count(*) AS profiles_with_slug FROM "CreatorProfile" WHERE slug IS NOT NULL AND slug != '';
SELECT count(*) AS profiles_without_slug FROM "CreatorProfile" WHERE slug IS NULL OR slug = '';
SQL
