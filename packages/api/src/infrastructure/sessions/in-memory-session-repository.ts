import type { Conversation } from "#domain/conversation/conversation";
import type { Message } from "#domain/conversation/message";
import type { SessionRepository } from "#domain/conversation/session-repository";
import { env } from "#infrastructure/config/env";

export class InMemorySessionRepository implements SessionRepository {
  private readonly conversations = new Map<string, Conversation>();

  get(sessionId: string): Conversation | undefined {
    return this.conversations.get(sessionId);
  }

  appendMessage(sessionId: string, message: Message): void {
    const conversation = this.conversations.get(sessionId) ?? {
      id: sessionId,
      messages: [],
    };
    conversation.messages.push(message);
    if (conversation.messages.length > env.maxHistoryMessages) {
      conversation.messages = conversation.messages.slice(
        -env.maxHistoryMessages,
      );
    }
    this.conversations.set(sessionId, conversation);
  }
}
