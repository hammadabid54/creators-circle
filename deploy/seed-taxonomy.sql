-- Seed DiscoveryTaxon for Kollabo.
-- Mirrors what apps/web/scripts/seed-discovery.cjs would have done on a
-- fresh sqlite DB, but as plain SQL for the Postgres instance.
--
-- IDs follow the `kind:slug` convention the seed script uses. The slug
-- function: lowercased, '&' -> 'and', every non-[a-z0-9] run collapsed to
-- '-', leading/trailing '-' trimmed.
--
-- Idempotent: ON CONFLICT (kind, slug) DO NOTHING.

-- ============================================================
-- NICHES (12)
-- ============================================================
INSERT INTO "DiscoveryTaxon"(id, kind, slug, label, value, "parentId", aliases, enabled) VALUES
  ('niche:lifestyle',                'niche', 'lifestyle',                'Lifestyle',         'Lifestyle',         NULL, '[]', true),
  ('niche:fashion',                  'niche', 'fashion',                  'Fashion',           'Fashion',           NULL, '[]', true),
  ('niche:health-and-wellness',      'niche', 'health-and-wellness',      'Health & Wellness', 'Health & Wellness', NULL, '["health"]', true),
  ('niche:fitness',                  'niche', 'fitness',                  'Fitness',           'Fitness',           NULL, '[]', true),
  ('niche:food-and-cooking',         'niche', 'food-and-cooking',         'Food & Cooking',    'Food & Cooking',    NULL, '["food","food bloggers","food influencers"]', true),
  ('niche:travel',                   'niche', 'travel',                   'Travel',            'Travel',            NULL, '[]', true),
  ('niche:beauty-and-makeup',        'niche', 'beauty-and-makeup',        'Beauty & Makeup',   'Beauty & Makeup',   NULL, '["beauty","beauty bloggers"]', true),
  ('niche:tech-and-gadgets',         'niche', 'tech-and-gadgets',         'Tech & Gadgets',    'Tech & Gadgets',    NULL, '["tech","technology"]', true),
  ('niche:parenting',                'niche', 'parenting',                'Parenting',         'Parenting',         NULL, '[]', true),
  ('niche:education',                'niche', 'education',                'Education',         'Education',         NULL, '[]', true),
  ('niche:personal-finance',         'niche', 'personal-finance',         'Personal Finance',  'Personal Finance',  NULL, '["finance"]', true),
  ('niche:comedy',                   'niche', 'comedy',                   'Comedy',            'Comedy',            NULL, '[]', true)
ON CONFLICT (kind, slug) DO NOTHING;

-- ============================================================
-- CITIES (13, deduped — Faisalabad appears twice in profile-data.ts)
-- ============================================================
INSERT INTO "DiscoveryTaxon"(id, kind, slug, label, value, "parentId", aliases, enabled) VALUES
  ('city:karachi',       'city', 'karachi',       'Karachi',      'Karachi',      NULL, '[]', true),
  ('city:lahore',        'city', 'lahore',        'Lahore',       'Lahore',       NULL, '[]', true),
  ('city:islamabad',     'city', 'islamabad',     'Islamabad',    'Islamabad',    NULL, '[]', true),
  ('city:rawalpindi',    'city', 'rawalpindi',    'Rawalpindi',   'Rawalpindi',   NULL, '[]', true),
  ('city:faisalabad',    'city', 'faisalabad',    'Faisalabad',   'Faisalabad',   NULL, '[]', true),
  ('city:multan',        'city', 'multan',        'Multan',       'Multan',       NULL, '[]', true),
  ('city:peshawar',      'city', 'peshawar',      'Peshawar',     'Peshawar',     NULL, '[]', true),
  ('city:quetta',        'city', 'quetta',        'Quetta',       'Quetta',       NULL, '[]', true),
  ('city:sialkot',       'city', 'sialkot',       'Sialkot',      'Sialkot',      NULL, '[]', true),
  ('city:hyderabad',     'city', 'hyderabad',     'Hyderabad',    'Hyderabad',    NULL, '[]', true),
  ('city:gujranwala',    'city', 'gujranwala',    'Gujranwala',   'Gujranwala',   NULL, '[]', true),
  ('city:bahawalpur',    'city', 'bahawalpur',    'Bahawalpur',   'Bahawalpur',   NULL, '[]', true),
  ('city:other',         'city', 'other',         'Other',        'Other',        NULL, '[]', true)
ON CONFLICT (kind, slug) DO NOTHING;

-- ============================================================
-- LANGUAGES (7)
-- ============================================================
INSERT INTO "DiscoveryTaxon"(id, kind, slug, label, value, "parentId", aliases, enabled) VALUES
  ('language:en', 'language', 'en', 'English',  'EN', NULL, '["english speaking"]', true),
  ('language:ur', 'language', 'ur', 'Urdu',     'UR', NULL, '["urdu speaking"]',    true),
  ('language:pn', 'language', 'pn', 'Punjabi',  'PN', NULL, '["punjabi speaking"]', true),
  ('language:sd', 'language', 'sd', 'Sindhi',   'SD', NULL, '["sindhi speaking"]',  true),
  ('language:ps', 'language', 'ps', 'Pashto',   'PS', NULL, '["pashto speaking"]',  true),
  ('language:bl', 'language', 'bl', 'Balochi',  'BL', NULL, '["balochi speaking"]', true),
  ('language:sk', 'language', 'sk', 'Saraiki',  'SK', NULL, '["saraiki speaking"]', true)
ON CONFLICT (kind, slug) DO NOTHING;

-- ============================================================
-- FORMATS (5) — used by discover filters
-- ============================================================
INSERT INTO "DiscoveryTaxon"(id, kind, slug, label, value, "parentId", aliases, enabled) VALUES
  ('format:reel',         'format', 'reel',         'Reels',            'reel',         NULL, '["reels","short form"]',     true),
  ('format:post',         'format', 'post',         'Sponsored posts',  'post',         NULL, '["sponsored post"]',         true),
  ('format:story',        'format', 'story',        'Stories',          'story',        NULL, '["stories"]',                true),
  ('format:youtube_long', 'format', 'youtube_long', 'YouTube videos',   'youtube_long', NULL, '["youtube video"]',          true),
  ('format:youtube_short','format', 'youtube_short','YouTube Shorts',   'youtube_short',NULL, '["youtube shorts"]',         true)
ON CONFLICT (kind, slug) DO NOTHING;
