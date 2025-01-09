import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RepositoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async getRepository(req: Request) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      include: { githubProfile: true },
    });

    if (!user?.githubProfile) {
      return [];
    }

    return await this.prisma.repository.findMany({
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
  }
}
