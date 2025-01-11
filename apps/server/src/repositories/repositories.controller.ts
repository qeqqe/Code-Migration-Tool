import {
  Controller,
  Get,
  Logger,
  Req,
  UseGuards,
  Param,
  Query,
} from '@nestjs/common';
import { RepositoriesService } from './repositories.service';
import { JwtAuthGuard } from '../auth/strategy/jwt.guard';
import { Request } from 'express';

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
    return await this.repositoriesService.getSpecificRepository(
      req.user.id,
      username,
      name,
      path
    );
  }
}
