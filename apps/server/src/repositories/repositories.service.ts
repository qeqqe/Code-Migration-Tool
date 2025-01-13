import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { RepositoryDto } from './types/repository.types';
import { Repository, Prisma } from '@prisma/client';
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

interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  path?: string;
}

interface AllRepositoriesResponse {
  githubRepos: RepositoryDto[];
  localRepos: {
    id: string;
    name: string;
    description?: string;
    files: {
      name: string;
      path: string;
      size: number;
    }[];
    createdAt: Date;
  }[];
}

interface GitHubTreeItem {
  path: string;
  type: string;
  sha: string;
  size?: number;
  url: string;
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
        ? await this.redis.getCachedFile(username, repoName, path)
        : await this.redis.getCachedRepo(username, repoName);

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
    await this.redis.invalidateCache(username, repoName);
  }

  async getAllRepositories(userId: string): Promise<AllRepositoriesResponse> {
    const [githubRepos, localRepos] = await Promise.all([
      this.getGithubRepositories(userId),
      this.prisma.localRepository.findMany({
        where: { userId },
        include: {
          files: {
            select: {
              name: true,
              path: true,
              size: true,
            },
          },
        },
      }),
    ]);

    return {
      githubRepos,
      localRepos,
    };
  }

  private async getGithubRepositories(
    userId: string
  ): Promise<RepositoryDto[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { githubProfile: true },
    });

    if (!user?.githubProfile) {
      return [];
    }

    const repositories = await this.prisma.repository.findMany({
      where: { githubProfileId: user.githubProfile.id },
      include: {
        githubProfile: {
          select: { login: true, avatarUrl: true },
        },
      },
    });

    return repositories.map(this.transformToDto);
  }

  async createLocalRepository(
    userId: string,
    data: { name: string; description?: string },
    files: UploadedFile[]
  ) {
    return this.prisma.$transaction(async (tx) => {
      // create the repository
      const repository = await tx.localRepository.create({
        data: {
          ...data,
          userId,
        },
      });

      // process and store files
      type LocalFilePromise = ReturnType<typeof tx.localFile.create>;

      const filePromises = files.map((file) => {
        if (file.size > 80 * 1024 * 1024) {
          throw new HttpException('File size exceeds 80MB limit', 400);
        }

        if (file.path?.includes('node_modules')) {
          return null; // skip node_modules files
        }

        return tx.localFile.create({
          data: {
            name: file.originalname,
            path: file.path || file.originalname,
            content: file.buffer.toString('utf-8'),
            size: file.size,
            mimeType: file.mimetype,
            localRepositoryId: repository.id,
          },
        });
      });

      const uploadedFiles = await Promise.all(
        filePromises.filter((p): p is LocalFilePromise => p !== null)
      );

      return {
        ...repository,
        files: uploadedFiles,
      };
    });
  }

  async uploadLocalFile(
    file: UploadedFile,
    repositoryId: string
  ): Promise<{ success: boolean; message: string; fileName: string }> {
    try {
      this.logger.log(
        `Processing upload for file: ${file.originalname} to repository: ${repositoryId}`
      );

      if (file.size > 80 * 1024 * 1024) {
        throw new HttpException('File size exceeds 80MB limit', 400);
      }

      type LocalFileWithRepo = Prisma.LocalFileGetPayload<{
        include: { localRepository: true };
      }>;

      const localFile = (await this.prisma.localFile.create({
        data: {
          name: file.originalname,
          path: file.path || file.originalname,
          content: file.buffer.toString('utf-8'),
          size: file.size,
          mimeType: file.mimetype,
          localRepositoryId: repositoryId,
        },
        include: {
          localRepository: true,
        },
      })) as LocalFileWithRepo;

      return {
        success: true,
        message: 'File uploaded successfully',
        fileName: localFile.name,
      };
    } catch (error) {
      this.logger.error('File upload failed:', {
        filename: file.originalname,
        error: error.message,
        stack: error.stack,
      });
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to upload file',
          fileName: file.originalname,
        },
        error.status || 500
      );
    }
  }

  async getLocalRepositoryFiles(repositoryId: string) {
    return this.prisma.localFile.findMany({
      where: { localRepositoryId: repositoryId },
      orderBy: { path: 'asc' },
    });
  }

  async getLocalRepositoryContent(
    userId: string,
    repoName: string,
    path?: string
  ): Promise<RepoContentResponse> {
    try {
      const repository = await this.prisma.localRepository.findFirst({
        where: {
          userId,
          name: repoName,
        },
        include: {
          files: true,
        },
      });

      if (!repository) {
        throw new HttpException('Repository not found', 404);
      }

      let currentContent;
      const files = await this.prisma.localFile.findMany({
        where: {
          localRepositoryId: repository.id,
          ...(path
            ? {
                path: {
                  startsWith: path + '/',
                },
              }
            : {}),
        },
      });

      if (path) {
        const file = await this.prisma.localFile.findFirst({
          where: {
            localRepositoryId: repository.id,
            path: path,
          },
        });

        if (file) {
          currentContent = {
            content: file.content || '',
            path: file.path,
            type: 'file' as const,
          };
        }
      }

      const contents = files.map((file) => ({
        name: file.name,
        path: file.path,
        type: 'file' as const,
        size: file.size,
        download_url: null,
        sha: '',
        url: '',
        html_url: '',
        git_url: '',
        _links: {
          self: '',
          git: '',
          html: '',
        },
      }));

      return {
        repository: {
          id: 0,
          name: repository.name,
          description: repository.description || '',
          private: true,
          defaultBranch: 'main',
          language: 'Unknown',
          stargazersCount: 0,
          watchersCount: 0,
          forksCount: 0,
          openIssuesCount: 0,
          visibility: 'private',
          migrationStatus: 'PENDING',
          migrationEligible: true,
          totalFiles: repository.files.length,
          htmlUrl: '',
          fullName: `local/${repository.name}`,
          size: 0,
          hasIssues: false,
          hasProjects: false,
          hasWiki: false,
          archived: false,
          disabled: false,
          fork: false,
          sshUrl: '',
          cloneUrl: '',
          gitUrl: '',
          homepage: '',
          technologies: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          githubProfile: {
            login: 'local',
            avatarUrl: '',
          },
          githubProfileId: 'local',
        },
        contents,
        currentContent,
      };
    } catch (error) {
      this.logger.error('Error fetching local repository:', error);
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

      // then fetch tree data
      const treeResponse = await fetch(
        `https://api.github.com/repos/${username}/${repoName}/git/trees/main?recursive=1`,
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
      return {
        repository: this.transformToDto(repository),
        tree: treeData.tree.map((item: GitHubTreeItem) => ({
          name: item.path.split('/').pop() || '',
          path: item.path,
          type: item.type === 'tree' ? 'dir' : 'file',
          sha: item.sha,
          size: item.size || 0,
          url: item.url,
        })),
      };
    } catch (error) {
      this.logger.error(`Error fetching repository tree: ${error.message}`);
      throw error;
    }
  }
}
