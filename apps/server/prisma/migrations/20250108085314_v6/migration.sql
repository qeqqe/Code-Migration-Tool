/*
  Warnings:

  - Added the required column `htmlUrl` to the `Repository` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `Repository` table without a default value. This is not possible if the table is not empty.
  - Added the required column `visibility` to the `Repository` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AuthMethod" AS ENUM ('LOCAL', 'GITHUB');

-- CreateEnum
CREATE TYPE "MigrationStatus" AS ENUM ('PENDING', 'ANALYZING', 'READY', 'MIGRATING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- AlterTable
CREATE SEQUENCE repository_id_seq;
ALTER TABLE "Repository" ADD COLUMN     "affectedFiles" INTEGER,
ADD COLUMN     "analyzedAt" TIMESTAMP(3),
ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cloneUrl" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "disabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fork" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "forksCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gitUrl" TEXT,
ADD COLUMN     "hasIssues" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "hasProjects" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "hasWiki" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "homepage" TEXT,
ADD COLUMN     "htmlUrl" TEXT NOT NULL,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "lastSynced" TIMESTAMP(3),
ADD COLUMN     "migrationEligible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "migrationStatus" "MigrationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "openIssuesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "size" INTEGER NOT NULL,
ADD COLUMN     "sshUrl" TEXT,
ADD COLUMN     "stargazersCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "technologies" TEXT[],
ADD COLUMN     "totalFiles" INTEGER,
ADD COLUMN     "totalLines" INTEGER,
ADD COLUMN     "visibility" TEXT NOT NULL,
ADD COLUMN     "watchersCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "id" SET DEFAULT nextval('repository_id_seq');
ALTER SEQUENCE repository_id_seq OWNED BY "Repository"."id";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "authMethod" "AuthMethod" NOT NULL DEFAULT 'LOCAL';

-- CreateTable
CREATE TABLE "Migration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sourceVersion" TEXT NOT NULL,
    "targetVersion" TEXT NOT NULL,
    "compatibilityRules" JSONB NOT NULL,
    "steps" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "repositoryId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Migration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MigrationJob" (
    "id" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "logs" JSONB[],
    "result" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "repositoryId" INTEGER NOT NULL,
    "migrationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filesChanged" JSONB[],

    CONSTRAINT "MigrationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Migration_type_idx" ON "Migration"("type");

-- CreateIndex
CREATE INDEX "Migration_repositoryId_idx" ON "Migration"("repositoryId");

-- CreateIndex
CREATE INDEX "MigrationJob_status_idx" ON "MigrationJob"("status");

-- CreateIndex
CREATE INDEX "MigrationJob_userId_idx" ON "MigrationJob"("userId");

-- CreateIndex
CREATE INDEX "MigrationJob_repositoryId_idx" ON "MigrationJob"("repositoryId");

-- CreateIndex
CREATE INDEX "Repository_language_idx" ON "Repository"("language");

-- CreateIndex
CREATE INDEX "Repository_migrationStatus_idx" ON "Repository"("migrationStatus");

-- AddForeignKey
ALTER TABLE "Migration" ADD CONSTRAINT "Migration_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Migration" ADD CONSTRAINT "Migration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MigrationJob" ADD CONSTRAINT "MigrationJob_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MigrationJob" ADD CONSTRAINT "MigrationJob_migrationId_fkey" FOREIGN KEY ("migrationId") REFERENCES "Migration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MigrationJob" ADD CONSTRAINT "MigrationJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
