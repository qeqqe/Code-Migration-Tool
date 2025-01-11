import { Injectable, Logger } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class RedisService {
  private client: RedisClientType;
  private readonly ttl: number;
  private readonly logger = new Logger(RedisService.name);

  constructor(private configService: ConfigService) {
    this.ttl = this.configService.get<number>('REDIS_CACHE_TTL') || 7200;
    this.client = createClient({
      url:
        this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379',
    });
    this.client.connect().catch((error) => {
      this.logger.error(`An error occured: ${error}`);
      throw error;
    });
  }
  async onModuleDestroy() {
    await this.client.quit();
  }

  private generateKey(parts: string[]): string {
    return parts.join(':').replace(/\//g, ':');
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key: string, value: any, ttl: number = this.ttl): Promise<void> {
    await this.client.setEx(key, ttl, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async getCachedRepo<T>(owner: string, repo: string): Promise<T | null> {
    const key = this.generateKey(['repo', owner, repo, 'data']);
    this.logger.debug(`Getting cached repo with key: ${key}`);
    return this.get<T>(key);
  }

  async cacheRepo(owner: string, repo: string, data: any) {
    const key = this.generateKey(['repo', owner, repo, 'data']);
    this.logger.debug(`Caching repo with key: ${key}`);
    await this.set(key, data);
  }

  async getCachedFile<T>(
    owner: string,
    repo: string,
    path: string
  ): Promise<T | null> {
    const key = this.generateKey(['repo', owner, repo, 'file', path]);
    this.logger.debug(`Getting cached file with key: ${key}`);
    return this.get<T>(key);
  }

  async cacheFile(owner: string, repo: string, path: string, data: any) {
    const key = this.generateKey(['repo', owner, repo, 'file', path]);
    this.logger.debug(`Caching file with key: ${key}`);
    await this.set(key, data);
  }

  async invalidateRepoCache(owner: string, repo: string) {
    const pattern = this.generateKey(['repo', owner, repo, '*']);
    this.logger.debug(`Invalidating cache with pattern: ${pattern}`);
    const keys = await this.client.keys(pattern);
    if (keys.length) {
      this.logger.debug(`Found ${keys.length} keys to invalidate`);
      await this.client.del(keys);
    }
  }

  async invalidateFileCache(owner: string, repo: string, path: string) {
    const key = `repo:${owner}:${repo}:file:${path}`;
    await this.delete(key);
  }
}
