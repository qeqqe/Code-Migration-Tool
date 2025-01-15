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
      const isFileAnalysis =
        data.message.toLowerCase().includes('explain') ||
        data.message.toLowerCase().includes('analyze');

      if (isFileAnalysis && data.files?.length) {
        const fileContents = await Promise.all(
          data.files.map(async (filePath) => {
            const cached = await this.redis.getCachedFile<any>(
              'current',
              'repo',
              filePath
            );
            if (cached?.content) {
              return `Here's the content of ${filePath}:\n\`\`\`\n${cached.content}\n\`\`\`\n`;
            }
            return '';
          })
        );

        fullPrompt = `${data.message}\n\n${fileContents.join('\n')}`;
      } else {
        fullPrompt = data.message;
      }

      this.logger.debug('Full prompt:', fullPrompt);

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
}
