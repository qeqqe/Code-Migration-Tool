-- Step 1: Create the GitHubProfile table
CREATE TABLE "GitHubProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "githubId" INTEGER NOT NULL,
    "nodeId" TEXT NOT NULL,
    "avatarUrl" TEXT NOT NULL,
    "gravatarId" TEXT,
    "url" TEXT NOT NULL,
    "htmlUrl" TEXT NOT NULL,
    "followersUrl" TEXT NOT NULL,
    "followingUrl" TEXT NOT NULL,
    "gistsUrl" TEXT NOT NULL,
    "starredUrl" TEXT NOT NULL,
    "subscriptionsUrl" TEXT NOT NULL,
    "organizationsUrl" TEXT NOT NULL,
    "reposUrl" TEXT NOT NULL,
    "eventsUrl" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userViewType" TEXT,
    "siteAdmin" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    "company" TEXT,
    "blog" TEXT,
    "location" TEXT,
    "email" TEXT,
    "hireable" BOOLEAN,
    "bio" TEXT,
    "twitterUsername" TEXT,
    "publicRepos" INTEGER NOT NULL,
    "publicGists" INTEGER NOT NULL,
    "followers" INTEGER NOT NULL,
    "following" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitHubProfile_pkey" PRIMARY KEY ("id")
);

-- Step 2: Create initial GitHub profiles for existing users
INSERT INTO "GitHubProfile" ("id", "userId", "login", "githubId", "nodeId", "avatarUrl", "url", "htmlUrl", 
    "followersUrl", "followingUrl", "gistsUrl", "starredUrl", "subscriptionsUrl", "organizationsUrl", 
    "reposUrl", "eventsUrl", "type", "publicRepos", "publicGists", "followers", "following", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid(), -- Generate UUID for id
    u.id, -- userId
    u.username, -- login
    (CASE WHEN u."githubId" IS NULL THEN 0 ELSE CAST(u."githubId" AS INTEGER) END), -- githubId
    '', -- nodeId
    '', -- avatarUrl
    '', -- url
    '', -- htmlUrl
    '', -- followersUrl
    '', -- followingUrl
    '', -- gistsUrl
    '', -- starredUrl
    '', -- subscriptionsUrl
    '', -- organizationsUrl
    '', -- reposUrl
    '', -- eventsUrl
    'User', -- type
    0, -- publicRepos
    0, -- publicGists
    0, -- followers
    0, -- following
    u."createdAt", -- createdAt
    u."updatedAt" -- updatedAt
FROM "User" u
WHERE u."githubId" IS NOT NULL;

-- Step 3: Add githubProfileId column to Repository table as nullable first
ALTER TABLE "Repository" ADD COLUMN "githubProfileId" TEXT;

-- Step 4: Update repositories with corresponding githubProfileId
UPDATE "Repository" r
SET "githubProfileId" = (
    SELECT gp.id 
    FROM "GitHubProfile" gp 
    INNER JOIN "User" u ON u.id = gp."userId" 
    WHERE u.id = r."userId"
);

-- Step 5: Make githubProfileId required
ALTER TABLE "Repository" ALTER COLUMN "githubProfileId" SET NOT NULL;

-- Step 6: Create indexes and constraints
CREATE UNIQUE INDEX "GitHubProfile_userId_key" ON "GitHubProfile"("userId");
CREATE UNIQUE INDEX "GitHubProfile_githubId_key" ON "GitHubProfile"("githubId");
CREATE INDEX "GitHubProfile_login_idx" ON "GitHubProfile"("login");

-- Step 7: Add foreign key constraints
ALTER TABLE "GitHubProfile" ADD CONSTRAINT "GitHubProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Repository" ADD CONSTRAINT "Repository_githubProfileId_fkey" FOREIGN KEY ("githubProfileId") REFERENCES "GitHubProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 8: Update repository unique constraint
DROP INDEX IF EXISTS "Repository_userId_fullName_key";
CREATE UNIQUE INDEX "Repository_githubProfileId_fullName_key" ON "Repository"("githubProfileId", "fullName");

-- Step 9: Remove old userId column from Repository
ALTER TABLE "Repository" DROP COLUMN "userId";
