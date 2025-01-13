import { Injectable, Logger, HttpException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { RedisService } from '../redis/redis.service';

interface FileChange {
  [key: string]: string;
  path: string;
  content: string;
  originalContent: string;
}

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(private prisma: PrismaService, private redis: RedisService) {}

  async createMigrationJob(
    repositoryId: number,
    userId: string,
    data: {
      name: string;
      description: string;
      type: string;
      sourceVersion: string;
      targetVersion: string;
    }
  ) {
    return this.prisma.$transaction(async (tx) => {
      // create migration record
      const migration = await tx.migration.create({
        data: {
          name: data.name,
          description: data.description,
          type: data.type,
          sourceVersion: data.sourceVersion,
          targetVersion: data.targetVersion,
          compatibilityRules: {},
          steps: {},
          repositoryId,
          userId,
        },
      });

      // create migration job
      const job = await tx.migrationJob.create({
        data: {
          status: 'PENDING',
          progress: 0,
          logs: [],
          filesChanged: [],
          repositoryId,
          userId,
          migrationId: migration.id,
        },
        include: {
          migration: true,
          repository: true,
        },
      });

      // update repository status
      await tx.repository.update({
        where: { id: repositoryId },
        data: { migrationStatus: 'ANALYZING' },
      });

      return job;
    });
  }

  async getFileContent(
    userId: string,
    username: string,
    repoName: string,
    path: string
  ) {
    try {
      // try to get from cache first
      const cachedContent = await this.redis.getCachedFile<any>(
        username,
        repoName,
        path
      );
      if (cachedContent) {
        this.logger.debug(
          `Cache hit for file: ${username}/${repoName}/${path}`
        );
        return cachedContent;
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { githubToken: true },
      });

      if (!user?.githubToken) {
        throw new HttpException('User not authorized', 401);
      }

      // first get the file metadata to get the download_url
      const metadataResponse = await fetch(
        `https://api.github.com/repos/${username}/${repoName}/contents/${path}`,
        {
          headers: {
            Authorization: `token ${user.githubToken.accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (!metadataResponse.ok) {
        throw new HttpException(
          'Failed to fetch file metadata',
          metadataResponse.status
        );
      }

      const metadata = await metadataResponse.json();

      // then fetch the actual content using the download_url
      const contentResponse = await fetch(metadata.download_url, {
        headers: {
          Authorization: `token ${user.githubToken.accessToken}`,
        },
      });

      if (!contentResponse.ok) {
        throw new HttpException(
          'Failed to fetch file content',
          contentResponse.status
        );
      }

      const content = await contentResponse.text();
      const responseData = { content };

      // cache the file content
      await this.redis.cacheFile(username, repoName, path, responseData);
      return responseData;
    } catch (error) {
      this.logger.error(`Error fetching file content: ${error.message}`);
      throw error;
    }
  }

  async saveFileChanges(
    userId: string,
    username: string,
    repoName: string,
    changes: FileChange[]
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { githubToken: true },
      });

      if (!user?.githubToken) {
        throw new HttpException('User not authorized', 401);
      }

      // create a migration job for tracking changes
      const repository = await this.prisma.repository.findFirst({
        where: {
          fullName: `${username}/${repoName}`,
        },
      });

      if (!repository) {
        throw new HttpException('Repository not found', 404);
      }

      const migration = await this.createMigrationJob(repository.id, userId, {
        name: `Migration-${Date.now()}`,
        description: 'Auto-generated migration',
        type: 'code-modification',
        sourceVersion: 'current',
        targetVersion: 'updated',
      });

      // update migration job with changes
      await this.prisma.migrationJob.update({
        where: { id: migration.id },
        data: {
          filesChanged: changes.map((change) => ({
            path: change.path,
            content: change.content,
            originalContent: change.originalContent,
          })) satisfies Prisma.JsonArray,
          status: 'COMPLETED',
          progress: 100,
        },
      });

      // invalidate cache after changes
      await this.redis.invalidateCache(username, repoName);
      return { success: true, migrationId: migration.id };
    } catch (error) {
      this.logger.error(`Error saving file changes: ${error.message}`);
      throw error;
    }
  }

  async getRepositoryTree(userId: string, username: string, repoName: string) {
    try {
      // Try to get from cache first
      const cachedData = await this.redis.getCachedTree<any>(
        username,
        repoName
      );
      if (cachedData) {
        this.logger.debug(`Cache hit for tree: ${username}/${repoName}`);
        return cachedData;
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          githubToken: true,
          githubProfile: true,
        },
      });

      if (!user?.githubToken) {
        throw new HttpException('User not authorized', 401);
      }

      // first get repository data
      const repository = await this.prisma.repository.findFirst({
        where: {
          AND: [
            { githubProfileId: user.githubProfile.id },
            { fullName: `${username}/${repoName}` },
          ],
        },
        include: {
          githubProfile: {
            select: {
              login: true,
              avatarUrl: true,
            },
          },
        },
      });

      if (!repository) {
        throw new HttpException('Repository not found', 404);
      }

      // get default branch from repository
      const defaultBranch = repository.defaultBranch || 'main';

      // then fetch tree data using the correct branch
      const treeResponse = await fetch(
        `https://api.github.com/repos/${username}/${repoName}/git/trees/${defaultBranch}?recursive=1`,
        {
          headers: {
            Authorization: `token ${user.githubToken.accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (!treeResponse.ok) {
        throw new HttpException(
          'Failed to fetch repository tree',
          treeResponse.status
        );
      }

      const treeData = await treeResponse.json();

      // if it's a directory, fetch its contents
      const contentsResponse = await fetch(
        `https://api.github.com/repos/${username}/${repoName}/contents`,
        {
          headers: {
            Authorization: `token ${user.githubToken.accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (!contentsResponse.ok) {
        throw new HttpException(
          'Failed to fetch repository contents',
          contentsResponse.status
        );
      }

      const contents = await contentsResponse.json();

      const responseData = {
        repository: this.transformToDto(repository),
        contents: contents.map((item: any) => ({
          name: item.name,
          path: item.path,
          type: item.type,
          sha: item.sha,
          size: item.size || 0,
          url: item.url,
          html_url: item.html_url,
          git_url: item.git_url,
          download_url: item.download_url,
          _links: item._links,
        })),
      };

      // cache the transformed data
      await this.redis.cacheTree(username, repoName, responseData);
      return responseData;
    } catch (error) {
      this.logger.error(`Error fetching repository tree: ${error.message}`);
      throw error;
    }
  }

  async getDirectoryContents(
    userId: string,
    username: string,
    repoName: string,
    path: string
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { githubToken: true },
      });

      if (!user?.githubToken) {
        throw new HttpException('User not authorized', 401);
      }

      const response = await fetch(
        `https://api.github.com/repos/${username}/${repoName}/contents/${path}`,
        {
          headers: {
            Authorization: `token ${user.githubToken.accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (!response.ok) {
        throw new HttpException(
          'Failed to fetch directory contents',
          response.status
        );
      }

      const contents = await response.json();
      return {
        contents: Array.isArray(contents)
          ? contents.map((item) => ({
              name: item.name,
              path: item.path,
              type: item.type, // preserve the original type from GitHub
              sha: item.sha,
              size: item.size || 0,
              url: item.url,
              html_url: item.html_url,
              git_url: item.git_url,
              download_url: item.download_url,
              _links: item._links,
            }))
          : [contents],
      };
    } catch (error) {
      this.logger.error(`Error fetching directory contents: ${error.message}`);
      throw error;
    }
  }

  // helper function to transform repository data
  private transformToDto(repository: any) {
    return {
      ...repository,
      visibility: repository.visibility as 'public' | 'private' | 'internal',
      migrationStatus: repository.migrationStatus as
        | 'PENDING'
        | 'ANALYZING'
        | 'READY'
        | 'MIGRATING'
        | 'COMPLETED',
    };
  }
}
