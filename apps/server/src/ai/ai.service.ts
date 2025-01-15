import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly API_URL =
    process.env.LM_STUDIO_API_URL || 'http://localhost:1234/v1';

  async chat(message: string): Promise<string> {
    try {
      this.logger.debug(`Sending request to LM Studio at ${this.API_URL}`);

      const systemPrompt =
        'You are a helpful programming assistant. Provide clear, concise responses without unnecessary markdown formatting or code block labels. When showing code, use appropriate syntax highlighting but avoid explanatory text unless specifically asked.';

      const fullPrompt = `${systemPrompt}\n\nUser: ${message}\n\nAssistant:`;

      const response = await fetch(`${this.API_URL}/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          model: 'deepseek-coder-6.7b-instruct',
          temperature: 0.7,
          max_tokens: 2000,
          stop: ['\nUser:', '\n\nHuman:'],
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
        if (!data.choices?.[0]?.text) {
          throw new Error('Invalid response format from LM Studio');
        }
        return data.choices[0].text.trim();
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
