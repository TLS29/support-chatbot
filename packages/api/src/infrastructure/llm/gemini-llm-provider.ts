import { GoogleGenAI, ApiError, type Content } from "@google/genai";
import type { Message } from "#domain/conversation/message";
import type { LLMProvider } from "#domain/llm/llm-provider";
import { LLMRateLimitError, LLMUnavailableError } from "#domain/llm/errors";
import { logger } from "#infrastructure/config/logger";

export class GeminiLLMProvider implements LLMProvider {
  constructor(
    private readonly genAI: GoogleGenAI,
    private readonly modelName = "gemini-2.5-flash-lite",
  ) {}

  async *chat(
    messages: Message[],
    systemPrompt: string,
  ): AsyncIterable<string> {
    try {
      const stream = await this.genAI.models.generateContentStream({
        model: this.modelName,
        contents: this.toGeminiContents(messages),
        config: { systemInstruction: systemPrompt },
      });

      for await (const chunk of stream) {
        if (chunk.text) {
          yield chunk.text;
        }
      }
    } catch (error) {
      logger.error({ err: error }, "Gemini request failed");

      if (error instanceof ApiError && error.status === 429) {
        throw new LLMRateLimitError();
      }
      throw new LLMUnavailableError();
    }
  }

  private toGeminiContents(messages: Message[]): Content[] {
    return messages.map((message) => ({
      role: message.role,
      parts: [{ text: message.text }],
    }));
  }
}
