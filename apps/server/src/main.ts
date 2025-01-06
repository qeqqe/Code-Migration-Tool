/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { ConfigService } from '@nestjs/config';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  const configService = app.get(ConfigService);
  app.setGlobalPrefix(globalPrefix);
  app.enableCors({
    origin: configService.get<string>('FRONTEND_ORIGIN'),
    methods: 'GET,POST,DELETE,PUT',
    credentials: true,
    allowedHeaders: 'Content-Type,Authorization',
  });
  const port = process.env.PORT || 3001;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();
