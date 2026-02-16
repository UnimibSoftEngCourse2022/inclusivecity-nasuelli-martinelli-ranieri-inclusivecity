-- CreateExtension
CREATE
EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "BarrierState" AS ENUM ('ACTIVE', 'RESOLVED', 'IN_REVIEW', 'HIDDEN');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('DOES_NOT_EXIST', 'DUPLICATE', 'INAPPROPRIATE', 'WRONG_LOCATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ResolutionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BARRIER_APPROVED', 'BARRIER_REJECTED', 'BARRIER_RESOLVED', 'NEW_FEEDBACK', 'SYSTEM_ALERT');

-- CreateTable
CREATE TABLE "Disability"
(
    "id"            TEXT    NOT NULL,
    "name"          TEXT    NOT NULL,
    "description"   TEXT    NOT NULL,
    "mobilityLevel" INTEGER NOT NULL,

    CONSTRAINT "Disability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User"
(
    "id"              UUID         NOT NULL,
    "email"           TEXT         NOT NULL,
    "firstName"       TEXT         NOT NULL,
    "lastName"        TEXT,
    "role"            "Role"       NOT NULL DEFAULT 'USER',
    "profilePicUrl"   TEXT,
    "reputationScore" INTEGER      NOT NULL DEFAULT 0,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabilityId"    TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceToken"
(
    "id"         TEXT         NOT NULL,
    "token"      TEXT         NOT NULL,
    "deviceType" TEXT,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId"     UUID         NOT NULL,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Barrier"
(
    "id"            TEXT             NOT NULL,
    "title"         TEXT             NOT NULL,
    "description"   TEXT             NOT NULL,
    "address"       TEXT,
    "photoUrls"     TEXT[],
    "difficulty"    INTEGER          NOT NULL,
    "location"      geometry(Point, 4326) NOT NULL,
    "state"         "BarrierState"   NOT NULL DEFAULT 'ACTIVE',
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRatings"  INTEGER          NOT NULL DEFAULT 0,
    "createdAt"     TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3)     NOT NULL,
    "userId"        UUID             NOT NULL,
    "typeId"        TEXT             NOT NULL,

    CONSTRAINT "Barrier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BarrierType"
(
    "id"                TEXT    NOT NULL,
    "label"             TEXT    NOT NULL,
    "defaultDifficulty" INTEGER NOT NULL,
    "iconKey"           TEXT,
    "colorHex"          TEXT,

    CONSTRAINT "BarrierType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback"
(
    "id"        TEXT         NOT NULL,
    "rating"    INTEGER      NOT NULL,
    "comment"   TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId"    UUID         NOT NULL,
    "barrierId" TEXT         NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report"
(
    "id"        TEXT           NOT NULL,
    "reason"    "ReportReason" NOT NULL,
    "status"    "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId"    UUID           NOT NULL,
    "barrierId" TEXT           NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resolution"
(
    "id"          TEXT               NOT NULL,
    "status"      "ResolutionStatus" NOT NULL DEFAULT 'PENDING',
    "evidenceUrl" TEXT,
    "comment"     TEXT,
    "createdAt"   TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt"  TIMESTAMP(3),
    "userId"      UUID               NOT NULL,
    "approverId"  UUID,
    "barrierId"   TEXT               NOT NULL,

    CONSTRAINT "Resolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification"
(
    "id"        TEXT               NOT NULL,
    "title"     TEXT               NOT NULL,
    "body"      TEXT               NOT NULL,
    "type"      "NotificationType" NOT NULL,
    "isRead"    BOOLEAN            NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId"    UUID               NOT NULL,
    "barrierId" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User" ("email");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken" ("token");

-- CreateIndex
CREATE INDEX "DeviceToken_userId_idx" ON "DeviceToken" ("userId");

-- CreateIndex
CREATE INDEX "location_idx" ON "Barrier" USING GIST ("location");

-- CreateIndex
CREATE INDEX "Barrier_state_idx" ON "Barrier" ("state");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_userId_barrierId_key" ON "Feedback" ("userId", "barrierId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification" ("userId");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification" ("createdAt");

-- AddForeignKey
ALTER TABLE "User"
    ADD CONSTRAINT "User_disabilityId_fkey" FOREIGN KEY ("disabilityId") REFERENCES "Disability" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceToken"
    ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Barrier"
    ADD CONSTRAINT "Barrier_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Barrier"
    ADD CONSTRAINT "Barrier_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "BarrierType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback"
    ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback"
    ADD CONSTRAINT "Feedback_barrierId_fkey" FOREIGN KEY ("barrierId") REFERENCES "Barrier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report"
    ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report"
    ADD CONSTRAINT "Report_barrierId_fkey" FOREIGN KEY ("barrierId") REFERENCES "Barrier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resolution"
    ADD CONSTRAINT "Resolution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resolution"
    ADD CONSTRAINT "Resolution_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resolution"
    ADD CONSTRAINT "Resolution_barrierId_fkey" FOREIGN KEY ("barrierId") REFERENCES "Barrier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification"
    ADD CONSTRAINT "Notification_barrierId_fkey" FOREIGN KEY ("barrierId") REFERENCES "Barrier" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- POST GIS
CREATE
EXTENSION IF NOT EXISTS postgis;

-- FUNCTION per aggiornare la media dei voti sulla Barriera
CREATE
OR REPLACE FUNCTION update_barrier_rating()
RETURNS TRIGGER AS $$
BEGIN
UPDATE "Barrier"
SET "averageRating" = (SELECT COALESCE(AVG(rating), 0)
                       FROM "Feedback"
                       WHERE "barrierId" = COALESCE(NEW."barrierId", OLD."barrierId")),
    "totalRatings"  = (SELECT COUNT(*)
                       FROM "Feedback"
                       WHERE "barrierId" = COALESCE(NEW."barrierId", OLD."barrierId")),
    "updatedAt"     = NOW()
WHERE id = COALESCE(NEW."barrierId", OLD."barrierId");

RETURN NEW;
END;
$$
LANGUAGE plpgsql;

-- TRIGGER on insert new user
DROP TRIGGER IF EXISTS feedback_insert ON "Feedback";
CREATE TRIGGER feedback_insert
    AFTER INSERT
    ON "Feedback"
    FOR EACH ROW
    EXECUTE FUNCTION update_barrier_rating();

-- TRIGGER on update feedback
DROP TRIGGER IF EXISTS feedback_update ON "Feedback";
CREATE TRIGGER feedback_update
    AFTER UPDATE
    ON "Feedback"
    FOR EACH ROW
    EXECUTE FUNCTION update_barrier_rating();

-- TRIGGER on delete feedback
DROP TRIGGER IF EXISTS feedback_delete ON "Feedback";
CREATE TRIGGER feedback_delete
    AFTER DELETE
    ON "Feedback"
    FOR EACH ROW
    EXECUTE FUNCTION update_barrier_rating();
