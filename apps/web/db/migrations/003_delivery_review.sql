CREATE TABLE IF NOT EXISTS "DeliveryReview" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "submissionId" TEXT NOT NULL UNIQUE REFERENCES "ContentSubmission"("id") ON DELETE CASCADE,
 "reviewerId" TEXT NOT NULL REFERENCES "User"("id"),
 "action" TEXT NOT NULL CHECK(action IN ('approve','revise')),
 "feedback" TEXT NOT NULL,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
