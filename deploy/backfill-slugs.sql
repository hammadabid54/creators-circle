-- Backfill CreatorProfile.slug for any profile that's missing one.
-- Slug is derived from User.name. If two creators would collide on the
-- same base slug, append -2, -3, ...
--
-- Idempotent: only updates rows where slug is NULL or ''. Existing slugs
-- are preserved.

WITH base AS (
  SELECT
    cp.id AS profile_id,
    cp."userId",
    trim(both '-' from lower(
      regexp_replace(
        translate(u.name, 'áàäâãåéèëêíìïîóòöôõúùüûýÿñçÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÝŸÑÇ',
                            'aaaaaae e ei ii o o ou u u yy nc AAAAAAEEEIII I O OOU U U YY NC'),
        '[^a-z0-9]+', '-', 'g')
    )) AS slug_base
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
WHERE cp.id = ranked.profile_id
  AND (cp.slug IS NULL OR cp.slug = '');

-- Sanity check: any profiles still without a slug?
SELECT cp.id, u.name, cp.slug
FROM "CreatorProfile" cp
JOIN "User" u ON u.id = cp."userId"
WHERE cp.slug IS NULL OR cp.slug = '';
