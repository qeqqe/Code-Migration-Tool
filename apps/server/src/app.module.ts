import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { RepositoriesModule } from './repositories/repositories.module';
import { RedisModule } from './redis/redis.module';
import { MigrationModule } from './migration/migration.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisModule,
    AuthModule,
    PrismaModule,
    RepositoriesModule,
    MigrationModule,
    AiModule,
  ],
})
export class AppModule {}
