import { logger } from "#infrastructure/config/logger";
import { createApp } from "#interfaces/http/express/app";
import { beginShutdown } from "#infrastructure/observability/lifecycle";
import { env } from "#infrastructure/config/env";
import http from "node:http";

const app = createApp();
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
