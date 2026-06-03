import type { SessionRepository } from "#domain/conversation/session-repository";
import type { LLMProvider } from "#domain/llm/llm-provider";

export class SendMessageUseCase {
  constructor(
    private readonly llmProvider: LLMProvider,
    private readonly sessionRepository: SessionRepository,
    private readonly systemPrompt: string,
  ) {}

  async *execute(input: {
    sessionId: string;
    message: string;
  }): AsyncIterable<string> {
    const { sessionId, message } = input;

    this.sessionRepository.appendMessage(sessionId, {
      role: "user",
      text: message,
    });

    const conversation = this.sessionRepository.get(sessionId);
    const history = conversation?.messages ?? [];

    let fullResponse = "";

    for await (const chunk of this.llmProvider.chat(
      history,
      this.systemPrompt,
    )) {
      fullResponse += chunk;
      yield chunk;
    }

    this.sessionRepository.appendMessage(sessionId, {
      role: "model",
      text: fullResponse,
    });
  }
}
