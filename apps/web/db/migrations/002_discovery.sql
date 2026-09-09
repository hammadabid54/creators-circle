CREATE TABLE IF NOT EXISTS "DiscoveryTaxon" (
 "id" TEXT PRIMARY KEY NOT NULL,
 "kind" TEXT NOT NULL CHECK(kind IN ('niche','city','language','format')),
 "slug" TEXT NOT NULL,
 "label" TEXT NOT NULL,
 "value" TEXT NOT NULL,
 "parentId" TEXT REFERENCES DiscoveryTaxon(id),
 "aliases" TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(aliases)),
 "enabled" INTEGER NOT NULL DEFAULT 1,
 UNIQUE(kind,slug), UNIQUE(kind,value)
);
CREATE TABLE IF NOT EXISTS "CreatorTaxon" (
 "creatorId" TEXT NOT NULL REFERENCES CreatorProfile(id) ON DELETE CASCADE,
 "taxonId" TEXT NOT NULL REFERENCES DiscoveryTaxon(id) ON DELETE CASCADE,
 PRIMARY KEY(creatorId,taxonId)
);
CREATE INDEX IF NOT EXISTS "CreatorTaxon_lookup" ON CreatorTaxon(taxonId,creatorId);
CREATE TABLE IF NOT EXISTS "DiscoveryPage" (
 "path" TEXT PRIMARY KEY NOT NULL,
 "title" TEXT NOT NULL,
 "description" TEXT NOT NULL,
 "intro" TEXT NOT NULL,
 "filters" TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(filters)),
 "published" INTEGER NOT NULL DEFAULT 1,
 "indexable" INTEGER NOT NULL DEFAULT 0,
 "redirectTo" TEXT,
 "updatedAt" TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS "CreatorProfile_discovery" ON CreatorProfile(createdAt,userId);
CREATE INDEX IF NOT EXISTS "SocialAccount_discovery" ON SocialAccount(creatorId,platform,followers);
CREATE TRIGGER IF NOT EXISTS "CreatorProfile_taxonomy_insert" AFTER INSERT ON CreatorProfile BEGIN
 INSERT OR IGNORE INTO CreatorTaxon SELECT NEW.id,t.id FROM DiscoveryTaxon t
 WHERE (t.kind='niche' AND t.value IN (SELECT value FROM json_each(CASE WHEN json_valid(NEW.niches) THEN NEW.niches ELSE '[]' END)))
 OR (t.kind='language' AND t.value IN (SELECT value FROM json_each(CASE WHEN json_valid(NEW.languages) THEN NEW.languages ELSE '[]' END)))
 OR (t.kind='city' AND t.value=NEW.city);
END;
CREATE TRIGGER IF NOT EXISTS "CreatorProfile_taxonomy_update" AFTER UPDATE OF niches,languages,city ON CreatorProfile BEGIN
 DELETE FROM CreatorTaxon WHERE creatorId=NEW.id AND taxonId IN (SELECT id FROM DiscoveryTaxon WHERE kind IN ('niche','city','language'));
 INSERT OR IGNORE INTO CreatorTaxon SELECT NEW.id,t.id FROM DiscoveryTaxon t
 WHERE (t.kind='niche' AND t.value IN (SELECT value FROM json_each(CASE WHEN json_valid(NEW.niches) THEN NEW.niches ELSE '[]' END)))
 OR (t.kind='language' AND t.value IN (SELECT value FROM json_each(CASE WHEN json_valid(NEW.languages) THEN NEW.languages ELSE '[]' END)))
 OR (t.kind='city' AND t.value=NEW.city);
END;
CREATE TRIGGER IF NOT EXISTS "DiscoveryTaxon_backfill" AFTER INSERT ON DiscoveryTaxon BEGIN
 INSERT OR IGNORE INTO CreatorTaxon SELECT p.id,NEW.id FROM CreatorProfile p
 WHERE (NEW.kind='niche' AND NEW.value IN (SELECT value FROM json_each(CASE WHEN json_valid(p.niches) THEN p.niches ELSE '[]' END)))
 OR (NEW.kind='language' AND NEW.value IN (SELECT value FROM json_each(CASE WHEN json_valid(p.languages) THEN p.languages ELSE '[]' END)))
 OR (NEW.kind='city' AND NEW.value=p.city);
END;

