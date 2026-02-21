/*
  Warnings:

  - A unique constraint covering the columns `[userId,barrierId]` on the table `Report` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,barrierId]` on the table `Resolution` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Report_userId_barrierId_key" ON "Report"("userId", "barrierId");

-- CreateIndex
CREATE UNIQUE INDEX "Resolution_userId_barrierId_key" ON "Resolution"("userId", "barrierId");
