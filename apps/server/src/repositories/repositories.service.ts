import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RepositoriesService {
  constructor(private readonly prisma: PrismaService) {}
  async getRepository(req: Request) {
    return await this.prisma.repository.findMany({
      where: {
        userId: req.user.id,
      },
    });
  }
}
