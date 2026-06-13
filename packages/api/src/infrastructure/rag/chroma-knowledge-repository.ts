import { ChromaClient } from "chromadb";
import type {
  KnowledgeRepository,
  KnowledgeChunk,
  KnowledgeSearchResult,
} from "#domain/rag/knowledge-repository";
import { env } from "#infrastructure/config/env";
import { randomUUID } from "node:crypto";

export class ChromaKnowledgeRepository implements KnowledgeRepository {
  private client: ChromaClient;
  private collectionName = "support-knowledge";

  constructor() {
    this.client = new ChromaClient({ path: env.chromaUrl });
  }

  async add(chunks: KnowledgeChunk[]): Promise<void> {
    const collection = await this.getCollection();

    const ids = chunks.map(() => randomUUID());
    const embeddings = chunks.map((chunk) => chunk.embedding);
    const documents = chunks.map((chunk) => chunk.text);
    const metadatas = chunks.map((chunk) => chunk.metadata);

    await collection.add({
      ids,
      embeddings,
      metadatas,
      documents,
    });
  }

  async search(queryEmbedding: number[], topK: number): Promise<KnowledgeSearchResult[]> {
    const collection = await this.getCollection();
    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: topK,
    });

    const searchResults: KnowledgeSearchResult[] = [];

    const documents = results.documents[0] || [];
    const metadatas = results.metadatas[0] || [];
    const distances = results.distances?.[0] || [];

    for (let i = 0; i < documents.length; i++) {
      searchResults.push({
        text: documents[i] as string,
        metadata: metadatas[i] as { source: string },
        score: 1 - (distances[i] ?? 0) / 2,
      });
    }
    console.log(searchResults.map((r) => r.score));
    return searchResults;
  }

  async reset(): Promise<void> {
    try {
      await this.client.deleteCollection({ name: this.collectionName });
    } catch {
      // first run: collection doesn't exist yet — nothing to delete, that's fine
    }
  }

  private async getCollection() {
    return await this.client.getOrCreateCollection({
      name: this.collectionName,
      configuration: { hnsw: { space: "cosine" } },
    });
  }
}
