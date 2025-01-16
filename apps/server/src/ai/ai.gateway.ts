import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { AiService } from './ai.service';
import { Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

interface ChatData {
  message: string;
  files?: string[];
  model?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
  },
  transports: ['websocket'],
  namespace: '/',
})
export class AiGateway {
  private readonly logger = new Logger(AiGateway.name);

  constructor(
    private readonly aiService: AiService,
    private readonly redis: RedisService
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat')
  async handleChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ChatData
  ) {
    this.logger.debug(`Received chat message from ${client.id}:`, data);

    try {
      let fullPrompt = '';

      if (data.files?.length) {
        const validFiles: string[] = [];
        const fileContents = await Promise.all(
          data.files.map(async (filePath) => {
            try {
              // Fix the cache key format - remove the repo path prefix if present
              const normalizedPath = filePath.replace(
                /^qeqqe\/Code-Migration-Tool\//,
                ''
              );
              this.logger.debug(`Fetching file from cache: ${normalizedPath}`);

              const cached = await this.redis.getCachedFile<any>(
                'current',
                'repo',
                normalizedPath
              );

              if (!cached?.content) {
                this.logger.warn(`File content not found for ${filePath}`);
                // Try alternative path format
                const altPath = filePath.split('/').slice(-3).join('/');
                this.logger.debug(`Trying alternative path: ${altPath}`);

                const altCached = await this.redis.getCachedFile<any>(
                  'current',
                  'repo',
                  altPath
                );

                if (!altCached?.content) {
                  return null;
                }

                validFiles.push(filePath);
                const ext = this.getFileExtension(filePath);
                return `File: ${filePath}\n\`\`\`${ext}\n${altCached.content.trim()}\n\`\`\``;
              }

              validFiles.push(filePath);
              const ext = this.getFileExtension(filePath);
              return `File: ${filePath}\n\`\`\`${ext}\n${cached.content.trim()}\n\`\`\``;
            } catch (error) {
              this.logger.error(`Error fetching file ${filePath}:`, error);
              return null;
            }
          })
        );

        const validContents = fileContents.filter(Boolean);

        if (validContents.length === 0) {
          throw new Error(
            'Could not find the file content in cache. Please make sure the file is properly loaded first.'
          );
        }

        fullPrompt = `Please analyze these file(s):\n\n${validContents.join(
          '\n\n'
        )}\n\nUser question: ${data.message}`;
        this.logger.debug(`Processing ${validFiles.length} files`);
        this.logger.debug('Constructed prompt:', fullPrompt);
      } else {
        fullPrompt = data.message;
      }

      client.emit('chat-start');
      let currentResponse = '';

      const generator = this.aiService.streamChat(fullPrompt, data.model);
      for await (const chunk of generator) {
        if (!client.connected) break;
        currentResponse += chunk;
        client.emit('chat-response', { content: currentResponse });
      }

      if (client.connected) {
        client.emit('chat-complete');
      }
    } catch (error) {
      this.logger.error('Chat error:', error);
      if (client.connected) {
        client.emit('chat-error', {
          message: error.message || 'Failed to process chat message',
        });
      }
    }
  }

  private getFileExtension(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      cs: 'csharp',
      go: 'go',
      rs: 'rust',
      rb: 'ruby',
      php: 'php',
      html: 'html',
      css: 'css',
      json: 'json',
      yml: 'yaml',
      yaml: 'yaml',
      md: 'markdown',
    };
    return languageMap[ext] || ext;
  }
}
