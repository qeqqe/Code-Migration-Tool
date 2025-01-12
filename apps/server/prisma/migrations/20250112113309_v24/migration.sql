-- CreateTable
CREATE TABLE "local_repositories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "local_repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "local_files" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "content" TEXT,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "parentPath" TEXT,
    "localRepositoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "local_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "local_repositories_userId_name_key" ON "local_repositories"("userId", "name");

-- CreateIndex
CREATE INDEX "local_files_localRepositoryId_path_idx" ON "local_files"("localRepositoryId", "path");

-- AddForeignKey
ALTER TABLE "local_repositories" ADD CONSTRAINT "local_repositories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "local_files" ADD CONSTRAINT "local_files_localRepositoryId_fkey" FOREIGN KEY ("localRepositoryId") REFERENCES "local_repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
