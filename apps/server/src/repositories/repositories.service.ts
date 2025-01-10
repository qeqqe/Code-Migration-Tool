import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { RepositoryDto } from './types/repository.types';
import { Repository } from '@prisma/client';

@Injectable()
export class RepositoriesService {
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
    repoName: string
  ): Promise<RepositoryDto | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { githubProfile: true },
    });

    if (!user?.githubProfile) {
      return null;
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

    return repository ? this.transformToDto(repository) : null;
  }
}
