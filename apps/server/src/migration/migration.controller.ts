import {
  Controller,
  Post,
  Get,
  UseGuards,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/strategy/jwt.guard';
import { MigrationService } from './migration.service';
import { User } from '../auth/decorator/user.decorator';
import { Request } from 'express';

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

  @Get(':username/:name/contents/*')
  async getFileContent(
    @User() user,
    @Param('username') username: string,
    @Param('name') name: string,
    @Req() request: Request
  ) {
    // extract the full path from the URL
    const path = request.url.split('/contents/')[1];
    return this.migrationService.getFileContent(user.id, username, name, path);
  }

  @Get(':username/:name/tree')
  async getRepositoryTree(
    @User() user,
    @Param('username') username: string,
    @Param('name') name: string
  ) {
    console.log('Getting tree for:', username, name);
    const result = await this.migrationService.getRepositoryTree(
      user.id,
      username,
      name
    );
    console.log('Tree result:', result);
    return result;
  }

  @Post(':username/:name/save')
  async saveFileChanges(
    @User() user,
    @Param('username') username: string,
    @Param('name') name: string,
    @Body()
    changes: {
      files: { path: string; content: string; originalContent: string }[];
    }
  ) {
    return this.migrationService.saveFileChanges(
      user.id,
      username,
      name,
      changes.files
    );
  }

  @Get(':username/:name/directory/:path(*)')
  async getDirectoryContents(
    @User() user,
    @Param('username') username: string,
    @Param('name') name: string,
    @Param('path') path: string
  ) {
    return this.migrationService.getDirectoryContents(
      user.id,
      username,
      name,
      path
    );
  }
}
