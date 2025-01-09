/*
  Warnings:

  - You are about to drop the column `githubProfileId` on the `Repository` table. All the data in the column will be lost.
  - You are about to drop the `GitHubProfile` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,fullName]` on the table `Repository` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Repository` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "GitHubProfile" DROP CONSTRAINT "GitHubProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "Repository" DROP CONSTRAINT "Repository_githubProfileId_fkey";

-- DropIndex
DROP INDEX "Repository_githubProfileId_fullName_key";

-- AlterTable
ALTER TABLE "Repository" DROP COLUMN "githubProfileId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- DropTable
DROP TABLE "GitHubProfile";

-- CreateIndex
CREATE UNIQUE INDEX "Repository_userId_fullName_key" ON "Repository"("userId", "fullName");

-- AddForeignKey
ALTER TABLE "Repository" ADD CONSTRAINT "Repository_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
