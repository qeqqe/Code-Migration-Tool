import { Controller, Post, UseGuards, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/strategy/jwt.guard';
import { MigrationService } from './migration.service';
import { User } from '../auth/decorator/user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('migration')
export class MigrationController {
  constructor(private migrationService: MigrationService) {}

  @Post('create-job')
  createMigrationJob(
    @User() user,
    @Body()
    data: {
      repositoryId: number;
      name: string;
      description: string;
      type: string;
      sourceVersion: string;
      targetVersion: string;
    }
  ) {
    return this.migrationService.createMigrationJob(
      data.repositoryId,
      user.id,
      data
    );
  }
}
