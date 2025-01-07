import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/strategy/jwt.guard';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('repositories')
@UseGuards(JwtAuthGuard)
export class RepositoriesController {
  @Get()
  async getRepositories(@Req() req) {
    const userId = req.user.id;
    return prisma.repository.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
