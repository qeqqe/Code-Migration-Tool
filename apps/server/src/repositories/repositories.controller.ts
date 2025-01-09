import { Controller, Get, Logger, Req, UseGuards } from '@nestjs/common';
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
}
