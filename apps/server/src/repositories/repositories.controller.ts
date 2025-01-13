import {
  Controller,
  Get,
  Logger,
  Req,
  UseGuards,
  Param,
  Query,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  UploadedFiles,
} from '@nestjs/common';
import { RepositoriesService } from './repositories.service';
import { JwtAuthGuard } from '../auth/strategy/jwt.guard';
import { Request } from 'express';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer: Buffer;
}

@UseGuards(JwtAuthGuard)
@Controller('repositories')
export class RepositoriesController {
  private readonly logger = new Logger(RepositoriesController.name);
  constructor(private readonly repositoriesService: RepositoriesService) {}

  @Get('test')
  check() {
    return { msg: 'Repository works' };
  }
  @Get()
  getRepository(@Req() req: Request) {
    this.logger.debug(
      `Received request with user: ${JSON.stringify(req.user)}`
    );
    return this.repositoriesService.getRepository(req);
  }

  @Get(':username/:name')
  async getSpecificRepository(
    @Req() req: Request,
    @Param('username') username: string,
    @Param('name') name: string,
    @Query('path') path?: string
  ) {
    // add special handling for local repositories
    if (username === 'local') {
      return await this.repositoriesService.getLocalRepositoryContent(
        req.user.id,
        name,
        path
      );
    }
    return await this.repositoriesService.getSpecificRepository(
      req.user.id,
      username,
      name,
      path
    );
  }

  @Get(':username/:name/tree')
  async getRepositoryTree(
    @Req() req: Request,
    @Param('username') username: string,
    @Param('name') name: string
  ) {
    return this.repositoriesService.getRepositoryTree(
      req.user.id,
      username,
      name
    );
  }

  @Get('all')
  async getAllRepositories(@Req() req: Request) {
    return this.repositoriesService.getAllRepositories(req.user.id);
  }

  @Post('local')
  @UseInterceptors(FilesInterceptor('files', 20))
  async createLocalRepository(
    @Req() req: Request,
    @Body() data: { name: string; description?: string },
    @UploadedFiles() files: MulterFile[]
  ) {
    return this.repositoriesService.createLocalRepository(
      req.user.id,
      data,
      files
    );
  }

  @Post('local/:repositoryId/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('repositoryId') repositoryId: string,
    @UploadedFile() file: MulterFile
  ) {
    return this.repositoriesService.uploadLocalFile(file, repositoryId);
  }
}
