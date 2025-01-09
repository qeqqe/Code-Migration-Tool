/*
  Warnings:

  - You are about to drop the column `userId` on the `Repository` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[githubProfileId,fullName]` on the table `Repository` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `githubProfileId` to the `Repository` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Repository" DROP CONSTRAINT "Repository_userId_fkey";

-- DropIndex
DROP INDEX "Repository_userId_fullName_key";

-- AlterTable
ALTER TABLE "Repository" DROP COLUMN "userId",
ADD COLUMN     "githubProfileId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "GitHubProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "githubId" INTEGER NOT NULL,
    "nodeId" TEXT NOT NULL,
    "avatarUrl" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "htmlUrl" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT,
    "company" TEXT,
    "blog" TEXT,
    "location" TEXT,
    "email" TEXT,
    "bio" TEXT,
    "twitterUsername" TEXT,
    "publicRepos" INTEGER NOT NULL,
    "publicGists" INTEGER NOT NULL,
    "followers" INTEGER NOT NULL,
    "following" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "siteAdmin" BOOLEAN NOT NULL DEFAULT false,
    "hireable" BOOLEAN,

    CONSTRAINT "GitHubProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GitHubProfile_userId_key" ON "GitHubProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubProfile_githubId_key" ON "GitHubProfile"("githubId");

-- CreateIndex
CREATE INDEX "GitHubProfile_login_idx" ON "GitHubProfile"("login");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_githubProfileId_fullName_key" ON "Repository"("githubProfileId", "fullName");

-- AddForeignKey
ALTER TABLE "GitHubProfile" ADD CONSTRAINT "GitHubProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repository" ADD CONSTRAINT "Repository_githubProfileId_fkey" FOREIGN KEY ("githubProfileId") REFERENCES "GitHubProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
