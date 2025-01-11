import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { RepositoryDto } from './types/repository.types';
import { Repository } from '@prisma/client';
import { GitHubContent } from '../../typesInterface';
import { RedisService } from '../redis/redis.service';

interface RepoContentResponse {
  repository: RepositoryDto;
  contents: GitHubContent[];
  currentContent?: {
    content: string;
    path: string;
    type: 'file' | 'dir';
  };
}

@Injectable()
export class RepositoriesService {
  private readonly logger = new Logger(RepositoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  private transformToDto(
    repository: Repository & {
      githubProfile: { login: string; avatarUrl: string };
    }
  ): RepositoryDto {
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

  async getRepository(req: Request): Promise<RepositoryDto[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      include: { githubProfile: true },
    });

    if (!user?.githubProfile) {
      return [];
    }

    const repositories = await this.prisma.repository.findMany({
      where: {
        githubProfileId: user.githubProfile.id,
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

    return repositories.map(this.transformToDto);
  }

  async getSpecificRepository(
    userId: string,
    username: string,
    repoName: string,
    path?: string
  ): Promise<RepoContentResponse> {
    try {
      const cacheKey = path ? `file:${path}` : 'root';
      this.logger.debug(
        `Fetching repository: ${username}/${repoName}, path: ${cacheKey}`
      );

      // get cached data first
      const cachedData = path
        ? await this.redis.getCachedFile<RepoContentResponse>(
            username,
            repoName,
            path
          )
        : await this.redis.getCachedRepo<RepoContentResponse>(
            username,
            repoName
          );

      if (cachedData && this.isValidRepoResponse(cachedData)) {
        this.logger.debug(`Cache hit for ${username}/${repoName}/${cacheKey}`);
        return cachedData;
      }

      this.logger.debug(`Cache miss for ${username}/${repoName}/${cacheKey}`);

      // if not cached, fetch from GitHub
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { githubProfile: true, githubToken: true },
      });

      if (!user?.githubProfile) {
        throw new HttpException('User not found', 404);
      }

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

      const contentsUrl = path
        ? `https://api.github.com/repos/${username}/${repoName}/contents/${path}`
        : `https://api.github.com/repos/${username}/${repoName}/contents`;

      const contentsResponse = await fetch(contentsUrl, {
        headers: {
          Authorization: `token ${user.githubToken.accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!contentsResponse.ok) {
        throw new HttpException(
          'Failed to fetch repository contents',
          contentsResponse.status
        );
      }

      const contents = await contentsResponse.json();
      let currentContent;

      if (path && contents && !Array.isArray(contents)) {
        const fileContent = await fetch(contents.download_url);
        const content = await fileContent.text();
        currentContent = {
          content,
          path: contents.path,
          type: contents.type as 'file' | 'dir',
        };
      }

      const responseData = {
        repository: this.transformToDto(repository),
        contents: Array.isArray(contents) ? contents : [contents],
        currentContent,
      };

      // cache response
      try {
        if (path) {
          await this.redis.cacheFile(username, repoName, path, responseData);
          this.logger.debug(
            `Cached file data for ${username}/${repoName}/${path}`
          );
        } else {
          await this.redis.cacheRepo(username, repoName, responseData);
          this.logger.debug(`Cached repo data for ${username}/${repoName}`);
        }
      } catch (cacheError) {
        this.logger.error(`Failed to cache data: ${cacheError.message}`);
      }

      return responseData;
    } catch (error) {
      this.logger.error(`Error fetching repository: ${error.message}`);
      throw error;
    }
  }

  private isValidRepoResponse(data: unknown): data is RepoContentResponse {
    if (!data || typeof data !== 'object') return false;

    const response = data as Partial<RepoContentResponse>;
    return (
      !!response.repository &&
      Array.isArray(response.contents) &&
      (!response.currentContent ||
        (typeof response.currentContent === 'object' &&
          typeof response.currentContent.content === 'string' &&
          typeof response.currentContent.path === 'string' &&
          (response.currentContent.type === 'file' ||
            response.currentContent.type === 'dir')))
    );
  }

  // invalidate cache when needed
  async invalidateRepoCache(username: string, repoName: string): Promise<void> {
    await this.redis.invalidateRepoCache(username, repoName);
  }
}
