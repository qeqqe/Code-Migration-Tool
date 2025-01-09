/*
  Warnings:

  - Changed the type of `githubId` on the `GitHubProfile` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "GitHubProfile" DROP COLUMN "githubId",
ADD COLUMN     "githubId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "GitHubProfile_githubId_key" ON "GitHubProfile"("githubId");
