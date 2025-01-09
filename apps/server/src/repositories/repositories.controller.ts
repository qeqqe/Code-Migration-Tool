import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { RepositoriesService } from './repositories.service';
import { JwtAuthGuard } from '../auth/strategy/jwt.guard';
import { Request } from 'express';

@UseGuards(JwtAuthGuard)
@Controller('repositories')
export class RepositoriesController {
  constructor(private readonly repositoriesService: RepositoriesService) {}

  @Get()
  getRepository(@Req() req: Request) {
    return this.repositoriesService.getRepository(req);
  }
}
