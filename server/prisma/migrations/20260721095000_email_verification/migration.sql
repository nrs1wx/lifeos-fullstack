-- Add email verification state to users. Existing local/prod users are trusted
-- so this migration does not lock current accounts out.
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" DATETIME;

UPDATE "User"
SET "emailVerified" = true,
    "emailVerifiedAt" = CURRENT_TIMESTAMP
WHERE "emailVerified" = false;

CREATE TABLE "EmailVerificationCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailVerificationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "EmailVerificationCode_email_idx" ON "EmailVerificationCode"("email");
CREATE INDEX "EmailVerificationCode_userId_consumedAt_idx" ON "EmailVerificationCode"("userId", "consumedAt");
