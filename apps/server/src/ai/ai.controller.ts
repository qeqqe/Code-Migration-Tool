import { Controller, Post, Body, HttpException, Logger } from '@nestjs/common';
import { AiService } from './ai.service';

interface ChatRequest {
  message: string;
}

@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  async chat(@Body() body: ChatRequest) {
    try {
      this.logger.debug(`Received chat request with message: ${body.message}`);
      const response = await this.aiService.chat(body.message);
      return { response };
    } catch (error) {
      this.logger.error(`Chat error: ${error.message}`);
      throw new HttpException(
        error.message || 'AI service error',
        error.status || 500
      );
    }
  }
}
