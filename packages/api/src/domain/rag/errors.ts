export class EmbeddingRateLimitError extends Error {
  constructor(message: string = "Rate limit exceeded for embedding provider") {
    super(message);
    this.name = "EmbeddingRateLimitError";
  }
}

export class EmbeddingUnavailableError extends Error {
  constructor(message: string = "Embedding service is currently unavailable") {
    super(message);
    this.name = "EmbeddingUnavailableError";
  }
}
