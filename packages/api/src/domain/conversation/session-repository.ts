import type { Conversation } from "#domain/conversation/conversation";
import type { Message } from "#domain/conversation/message";

export interface SessionRepository {
  get(sessionId: string): Conversation | undefined;
  appendMessage(sessionId: string, message: Message): void;
}
