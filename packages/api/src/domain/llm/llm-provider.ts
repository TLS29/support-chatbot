import type { Message } from "#domain/conversation/message";

export interface LLMProvider {
  chat(messages: Message[], systemPrompt: string): AsyncIterable<string>;
}
