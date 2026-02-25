/*
  Warnings:

  - The values [BARRIER_APPROVED,BARRIER_REJECTED] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('NEW_FEEDBACK', 'BARRIER_RESOLVED', 'RESOLUTION_APPROVED', 'RESOLUTION_REJECTED', 'REPORT_ACCEPTED', 'REPORT_REJECTED', 'BARRIER_HIDDEN', 'SYSTEM_ALERT');
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "NotificationType_old";
COMMIT;
