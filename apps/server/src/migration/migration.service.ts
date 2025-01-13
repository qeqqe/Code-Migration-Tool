import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
      // Create migration record
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

      // Create migration job
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

      // Update repository status
      await tx.repository.update({
        where: { id: repositoryId },
        data: { migrationStatus: 'ANALYZING' },
      });

      return job;
    });
  }
}
