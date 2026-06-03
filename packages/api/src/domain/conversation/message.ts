export type MessageRole = "user" | "model";

export type Message = {
  role: MessageRole;
  text: string;
};
