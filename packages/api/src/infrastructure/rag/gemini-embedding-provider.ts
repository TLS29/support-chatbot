import type { EmbeddingProvider } from "#domain/rag/embedding-provider";
import {
  EmbeddingRateLimitError,
  EmbeddingUnavailableError,
} from "#domain/rag/errors";
import { GoogleGenAI } from "@google/genai";

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  constructor(private readonly genAI: GoogleGenAI) {}

  async embed(text: string): Promise<number[]> {
    try {
      const result = await this.genAI.models.embedContent({
        model: "gemini-embedding-001",
        contents: text,
      });

      if (result.embeddings) {
        return result.embeddings[0]?.values || [];
      }

      return [];
    } catch (error: any) {
      if (error?.status === 429) {
        throw new EmbeddingRateLimitError();
      }
      throw new EmbeddingUnavailableError(
        error?.message || "Error al conectar con Gemini",
      );
    }
  }
}
