import { DomainError } from "#domain/errors/DomainError";

export class LLMRateLimitError extends DomainError {
  constructor(
    message = "The service is temporarily busy. Please try again in a few seconds.",
  ) {
    super("LLM_RATE_LIMIT", message, 503);
  }
}

export class LLMUnavailableError extends DomainError {
  constructor(message = "The AI service is currently unavailable.") {
    super("LLM_UNAVAILABLE", message, 502);
  }
}
