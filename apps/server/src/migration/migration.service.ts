import { Injectable, Logger, HttpException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

interface FileChange {
  [key: string]: string; // More specific than any
  path: string;
  content: string;
  originalContent: string;
}

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(private prisma: PrismaService) {}

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
            Accept: 'application/vnd.github.v3.raw',
          },
        }
      );

      if (!response.ok) {
        throw new HttpException(
          'Failed to fetch file content',
          response.status
        );
      }

      const content = await response.text();
      return { content };
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

      // Create a migration job for tracking changes
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

      // Update migration job with changes
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

      return { success: true, migrationId: migration.id };
    } catch (error) {
      this.logger.error(`Error saving file changes: ${error.message}`);
      throw error;
    }
  }

  async getRepositoryTree(userId: string, username: string, repoName: string) {
    try {
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

      // First get repository data
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

      // Get default branch from repository
      const defaultBranch = repository.defaultBranch || 'main';

      // Then fetch tree data using the correct branch
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

      // Transform the tree data to match our RepoContent interface
      const transformedTree = treeData.tree
        .filter((item: any) => item.type === 'blob' || item.type === 'tree')
        .map((item: any) => ({
          name: item.path.split('/').pop(),
          path: item.path,
          type: item.type === 'tree' ? 'dir' : 'file',
          sha: item.sha,
          size: item.size || 0,
          url: item.url,
          html_url: `https://github.com/${username}/${repoName}/blob/${defaultBranch}/${item.path}`,
          git_url: item.url,
          download_url:
            item.type === 'blob'
              ? `https://raw.githubusercontent.com/${username}/${repoName}/${defaultBranch}/${item.path}`
              : null,
          _links: {
            self: item.url,
            git: item.url,
            html: `https://github.com/${username}/${repoName}/blob/${defaultBranch}/${item.path}`,
          },
        }));

      return {
        repository: this.transformToDto(repository),
        tree: transformedTree,
      };
    } catch (error) {
      this.logger.error(`Error fetching repository tree: ${error.message}`);
      throw error;
    }
  }

  // Helper function to transform repository data
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
