/*
  Warnings:

  - You are about to drop the column `tokenId` on the `Repository` table. All the data in the column will be lost.
  - You are about to drop the `GitHubToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Installation` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,fullName]` on the table `Repository` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Repository` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "GitHubToken" DROP CONSTRAINT "GitHubToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "Installation" DROP CONSTRAINT "Installation_repositoryId_fkey";

-- DropForeignKey
ALTER TABLE "Installation" DROP CONSTRAINT "Installation_userId_fkey";

-- DropForeignKey
ALTER TABLE "Repository" DROP CONSTRAINT "Repository_tokenId_fkey";

-- AlterTable
ALTER TABLE "Repository" DROP COLUMN "tokenId",
ADD COLUMN     "userId" TEXT NOT NULL,
ADD COLUMN     "webhookId" INTEGER,
ADD COLUMN     "webhookSecret" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "password" TEXT;

-- DropTable
DROP TABLE "GitHubToken";

-- DropTable
DROP TABLE "Installation";

-- CreateTable
CREATE TABLE "GithubToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "scopes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GithubToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GithubToken_userId_key" ON "GithubToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_userId_fullName_key" ON "Repository"("userId", "fullName");

-- AddForeignKey
ALTER TABLE "GithubToken" ADD CONSTRAINT "GithubToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Repository" ADD CONSTRAINT "Repository_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
