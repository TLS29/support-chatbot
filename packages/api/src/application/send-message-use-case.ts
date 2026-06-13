import type { SessionRepository } from "#domain/conversation/session-repository";
import type { LLMProvider } from "#domain/llm/llm-provider";
import type { EmbeddingProvider } from "#domain/rag/embedding-provider";
import type { KnowledgeRepository } from "#domain/rag/knowledge-repository";
import { env } from "#infrastructure/config/env";

type Message = {
  role: "user" | "model";
  text: string;
};

export class SendMessageUseCase {
  constructor(
    private readonly llmProvider: LLMProvider,
    private readonly sessionRepository: SessionRepository,
    private readonly systemPrompt: string,
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly knowledgeRepository: KnowledgeRepository,
  ) {}

  async *execute(input: { sessionId: string; message: string }): AsyncIterable<string> {
    const { sessionId, message } = input;

    const queryEmbedding = await this.embeddingProvider.embed(message);
    const searchResults = await this.knowledgeRepository.search(queryEmbedding, 3);
    console.log(searchResults.map((r) => ({ score: r.score, source: r.metadata.source })));

    const relevantChunks = searchResults.filter(
      (result) => result.score >= env.similarityThreshold,
    );

    let enrichedSystemPrompt = env.systemPrompt;

    if (relevantChunks.length > 0) {
      enrichedSystemPrompt += `\n\nINFORMACIÓN RELEVANTE DE LA PIZZERÍA:\n---\n`;
      for (const result of relevantChunks) {
        enrichedSystemPrompt += `${result.text}\n---\n`;
      }
      enrichedSystemPrompt +=
        `\nINSTRUCCIONES ESTRICTAS:\n` +
        `- Responde a la pregunta del usuario usando SOLO la INFORMACIÓN RELEVANTE proporcionada arriba.\n` +
        `- Si la respuesta no está en la información relevante, di exactamente: "No tengo esa información, déjame conectarte con un humano".`;
    }

    const userMessage: Message = { role: "user", text: input.message };
    this.sessionRepository.appendMessage(sessionId, userMessage);
    const session = this.sessionRepository.get(sessionId);

    const stream = this.llmProvider.chat(session?.messages ?? [], enrichedSystemPrompt);

    let fullResponse = "";
    for await (const chunk of stream) {
      fullResponse += chunk;
      yield chunk;
    }

    const modelMessage: Message = { role: "model", text: fullResponse };
    this.sessionRepository.appendMessage(sessionId, modelMessage);
  }
}
