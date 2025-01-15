import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly API_URL =
    process.env.LM_STUDIO_API_URL || 'http://localhost:1234/v1';

  async chat(message: string): Promise<string> {
    try {
      this.logger.debug(`Sending request to LM Studio at ${this.API_URL}`);
      this.logger.debug(`Message: ${message}`);

      const response = await fetch(`${this.API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: message,
            },
          ],
          model: 'local-model',
          temperature: 0.7,
          max_tokens: 2000,
          stream: false,
        }),
      });

      const responseText = await response.text();
      this.logger.debug(`Raw response: ${responseText}`);

      if (!response.ok) {
        throw new Error(
          `API call failed: ${response.status} - ${responseText}`
        );
      }

      try {
        const data = JSON.parse(responseText);
        if (!data.choices?.[0]?.message?.content) {
          throw new Error('Invalid response format from LM Studio');
        }
        return data.choices[0].message.content;
      } catch (parseError) {
        throw new Error(
          `Failed to parse LM Studio response: ${parseError.message}`
        );
      }
    } catch (error) {
      this.logger.error(`Chat error: ${error.message}`);
      if (error.message.includes('fetch failed')) {
        throw new Error(
          'Could not connect to LM Studio. Make sure it is running and the server is started.'
        );
      }
      throw error;
    }
  }
}
