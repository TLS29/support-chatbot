import { GoogleGenAI } from "@google/genai";
import { logger } from "#infrastructure/config/logger";
import { createApp } from "#interfaces/http/express/app";
import { beginShutdown } from "#infrastructure/observability/lifecycle";
import { env } from "#infrastructure/config/env";
import { GeminiLLMProvider } from "#infrastructure/llm/gemini-llm-provider";
import { InMemorySessionRepository } from "#infrastructure/sessions/in-memory-session-repository";
import { SendMessageUseCase } from "#application/send-message-use-case";
import http from "node:http";

const genAI = new GoogleGenAI({ apiKey: env.geminiApiKey });
const llmProvider = new GeminiLLMProvider(genAI);
const sessionRepository = new InMemorySessionRepository();
const sendMessageUseCase = new SendMessageUseCase(
  llmProvider,
  sessionRepository,
  env.systemPrompt,
);

const app = createApp({ sendMessageUseCase });
const server = http.createServer(app);

server.listen(env.port, () => {
  logger.info({ port: env.port, env: env.nodeEnv }, "Server started");
});
process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received.");
  beginShutdown();
  server.close(async () => {
    logger.info("Closed out remaining connections");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
});

process.on("SIGINT", () => {
  logger.info("SIGINT signal received.");
  beginShutdown();
  server.close(async () => {
    logger.info("Closed out remaining connections");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
});

process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled rejection");
  process.exit(1);
});
