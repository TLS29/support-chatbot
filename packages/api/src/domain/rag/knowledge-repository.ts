export type KnowledgeChunk = {
  text: string;
  embedding: number[];
  metadata: { source: string };
};

export type KnowledgeSearchResult = {
  text: string;
  metadata: { source: string };
  score: number;
};

export interface KnowledgeRepository {
  add(chunks: KnowledgeChunk[]): Promise<void>;
  search(queryEmbedding: number[], topK: number): Promise<KnowledgeSearchResult[]>;
}
