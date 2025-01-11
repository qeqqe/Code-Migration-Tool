import { Module, Logger } from '@nestjs/common';
import { RepositoriesController } from './repositories.controller';
import { RepositoriesService } from './repositories.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [RepositoriesController],
  providers: [RepositoriesService, PrismaService, Logger],
})
export class RepositoriesModule {}
