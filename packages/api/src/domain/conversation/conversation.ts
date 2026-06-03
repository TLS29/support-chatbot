import type { Message } from "#domain/conversation/message";

export type Conversation = {
  id: string;
  messages: Message[];
};
