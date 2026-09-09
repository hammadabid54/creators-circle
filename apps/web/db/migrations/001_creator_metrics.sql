CREATE TABLE IF NOT EXISTS "CreatorMetricSnapshot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "socialAccountId" TEXT NOT NULL REFERENCES "SocialAccount"("id") ON DELETE CASCADE,
  "observedAt" TEXT NOT NULL,
  "followers" INTEGER NOT NULL CHECK (followers >= 0),
  "source" TEXT NOT NULL,
  "posts" TEXT NOT NULL DEFAULT '[]',
  "cities" TEXT NOT NULL DEFAULT '[]',
  "ages" TEXT NOT NULL DEFAULT '[]',
  UNIQUE("socialAccountId", "observedAt")
);
CREATE INDEX IF NOT EXISTS "CreatorMetricSnapshot_account_time" ON "CreatorMetricSnapshot"("socialAccountId", "observedAt");
