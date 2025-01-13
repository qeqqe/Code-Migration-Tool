import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { RepositoryDto } from '../repositories/types/repository.types';

@Injectable()
export class RedisService {
  private readonly redis: Redis;
  private readonly logger = new Logger(RedisService.name);
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
    });
  }

  // cache keys
  private getTreeKey(username: string, repo: string) {
    return `tree:${username}:${repo}`;
  }

  private getFileKey(username: string, repo: string, path: string) {
    return `file:${username}:${repo}:${path}`;
  }

  async getCachedTree<T>(username: string, repo: string): Promise<T | null> {
    try {
      const data = await this.redis.get(this.getTreeKey(username, repo));
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`Redis cache get error: ${error.message}`);
      return null;
    }
  }

  async cacheTree(username: string, repo: string, data: unknown) {
    try {
      await this.redis.setex(
        this.getTreeKey(username, repo),
        this.CACHE_TTL,
        JSON.stringify(data)
      );
    } catch (error) {
      this.logger.error(`Redis cache set error: ${error.message}`);
    }
  }

  async getCachedFile<T>(
    username: string,
    repo: string,
    path: string
  ): Promise<T | null> {
    try {
      const data = await this.redis.get(this.getFileKey(username, repo, path));
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`Redis cache get error: ${error.message}`);
      return null;
    }
  }

  async cacheFile(
    username: string,
    repo: string,
    path: string,
    content: unknown
  ) {
    try {
      await this.redis.setex(
        this.getFileKey(username, repo, path),
        this.CACHE_TTL,
        JSON.stringify(content)
      );
    } catch (error) {
      this.logger.error(`Redis cache set error: ${error.message}`);
    }
  }

  async invalidateCache(username: string, repo: string) {
    try {
      const pattern = `*:${username}:${repo}*`;
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Redis cache invalidation error: ${error.message}`);
    }
  }

  async getCachedRepo(username: string, repoName: string) {
    try {
      const data = await this.redis.get(this.getTreeKey(username, repoName));
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`Redis cache get error: ${error.message}`);
      return null;
    }
  }

  async cacheRepo(username: string, repoName: string, responseData: unknown) {
    try {
      await this.redis.setex(
        this.getTreeKey(username, repoName),
        this.CACHE_TTL,
        JSON.stringify(responseData)
      );
    } catch (error) {
      this.logger.error(`Redis cache set error: ${error.message}`);
    }
  }
}
