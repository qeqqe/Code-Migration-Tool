import { Injectable, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly API_URL =
    process.env.LM_STUDIO_API_URL || 'http://localhost:1234/v1';

  private readonly SYSTEM_PROMPT = `You are a specialized code analysis assistant. Your task is to analyze code files with these specific rules:

1. Always focus on the ACTUAL code being shown, not generic explanations
2. When analyzing files, explain:
   - The specific context and purpose of THIS file
   - How THIS code works and what it does
   - Key patterns and features used in THIS code
   - Real examples from the code shown

3. For example, if analyzing a Socket.io context provider, explain:
   - The specific socket setup and configuration shown in the code
   - How the context and hooks are implemented in THIS file
   - The actual implementation details present
   - Real examples using the code that's shown

DO NOT:
- Give generic explanations about technologies
- Explain concepts not present in the code
- Ignore the actual implementation details
- Write long descriptions about related technologies

Keep responses focused on ONLY what's in the actual code being analyzed.`;

  private context: { role: string; content: string }[] = [];

  private readonly MODEL_MAP = {
    local: 'local model',
    qwen: 'qwen2.5-coder-7b-instruct',
    deepseek: 'deepseek-coder-33b-instruct',
    claude: 'claude-3-sonnet',
    openai: 'gpt-4',
    gemini: 'gemini-pro',
  } as const;

  private getModelName(selectedModel?: string) {
    if (!selectedModel || !this.MODEL_MAP[selectedModel]) {
      return 'deepseek-coder-6.7b-instruct'; // default model
    }
    return this.MODEL_MAP[selectedModel];
  }

  async chat(message: string): Promise<string> {
    try {
      this.logger.debug(`Sending request to LM Studio at ${this.API_URL}`);

      const response = await fetch(`${this.API_URL}/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `${this.SYSTEM_PROMPT}\n\nAnalyze this specific code:\n\n${message}`,
          model: 'qwen2.5-coder-7b-instruct',
          temperature: 0.2, // Reduced for more focused responses
          max_tokens: 1000, // Reduced to encourage conciseness
          stream: false,
          stop: [
            '\n\nHuman:',
            '\n\nAssistant:',
            '\n\n---',
            '\n\nAnalysis complete',
          ],
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

  async *streamChat(
    message: string,
    selectedModel?: string
  ): AsyncGenerator<string> {
    try {
      const isCodeAnalysis = message.includes('```');
      const formattedPrompt = isCodeAnalysis
        ? message // Keep the full message if it contains code blocks
        : `${this.SYSTEM_PROMPT}\n\n${message}`;

      const response = await fetch(`${this.API_URL}/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: formattedPrompt,
          model: this.getModelName(selectedModel),
          temperature: 0.2,
          max_tokens: 2000,
          stream: true,
          stop: ['\n\nHuman:', '\n\nAssistant:', '\n\n---'],
        }),
      });

      if (!response.ok) throw new Error(`API call failed: ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let sentence = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '' || !line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.slice(6));
            if (data.choices?.[0]?.text) {
              sentence += data.choices[0].text;
              // Yield complete words or sentences
              if (sentence.includes(' ') || sentence.includes('\n')) {
                yield sentence;
                sentence = '';
              }
            }
          } catch (error) {
            this.logger.error(`Error parsing stream data: ${error.message}`);
          }
        }
      }

      // Yield any remaining content
      if (sentence) {
        yield sentence;
      }
    } catch (error) {
      this.logger.error(`Stream chat error: ${error.message}`);
      throw error;
    }
  }

  addContext(message: { role: 'user' | 'assistant'; content: string }) {
    this.context.push(message);
    if (this.context.length > 20) {
      // Keep context window manageable
      this.context = this.context.slice(-20);
    }
  }
}
