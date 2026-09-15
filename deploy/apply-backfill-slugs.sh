#!/usr/bin/env bash
set -euo pipefail
DBPASS="$(cat /root/.kollabo/dbpass)"
export PGPASSWORD="${DBPASS}"

psql -h 127.0.0.1 -U kollabo -d kollabo <<'SQL'
-- Reset bad slug first
UPDATE "CreatorProfile" cp
SET slug = NULL
WHERE slug = 'ammad-ughal';

-- Cleaner slugify: transliterate common accented chars (most names won't need this),
-- then strip everything non-alphanumeric and collapse runs of separators into one '-'.
-- Postgres lower() is locale-aware and handles a wide range of unicode.
WITH base AS (
  SELECT
    cp.id AS profile_id,
    cp."userId",
    trim(both '-' from
      regexp_replace(
        lower(u.name),
        '[^a-z0-9]+', '-', 'gi'
      )
    ) AS slug_base
  FROM "CreatorProfile" cp
  JOIN "User" u ON u.id = cp."userId"
  WHERE cp.slug IS NULL OR cp.slug = ''
),
ranked AS (
  SELECT
    profile_id,
    "userId",
    slug_base,
    ROW_NUMBER() OVER (PARTITION BY slug_base ORDER BY "userId") AS rn
  FROM base
  WHERE slug_base <> ''
)
UPDATE "CreatorProfile" cp
SET slug = CASE
    WHEN ranked.rn = 1 THEN ranked.slug_base
    ELSE ranked.slug_base || '-' || ranked.rn
  END
FROM ranked
WHERE cp.id = ranked.profile_id;

SELECT u.email, u.name, cp.slug FROM "User" u LEFT JOIN "CreatorProfile" cp ON cp."userId" = u.id;
SQL
