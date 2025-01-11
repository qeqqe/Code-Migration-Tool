import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { RepositoryDto } from './types/repository.types';
import { Repository } from '@prisma/client';
import { GitHubContent } from '../../typesInterface';

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

  constructor(private readonly prisma: PrismaService) {}

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

    return {
      repository: this.transformToDto(repository),
      contents: Array.isArray(contents) ? contents : [contents],
      currentContent,
    };
  }
}
