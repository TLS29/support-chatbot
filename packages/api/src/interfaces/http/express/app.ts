import express, { type Express } from "express";
import { correlationIdMiddleware } from "./middlewares/correlationId";
import helmet from "helmet";
import cors from "cors";
import { requestLogger } from "./middlewares/requestLogger";
import { DomainError } from "#domain/errors/DomainError";
import { errorHandler } from "./middlewares/errorHandler";
import { createHealthRouter } from "./routes/health";

const createApp = (): Express => {
  const app = express();
  app.use(correlationIdMiddleware);
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);

  app.use("/health", createHealthRouter());

  app.use((req, _res, next) => {
    next(
      new DomainError(
        "NOT_FOUND",
        `Route ${req.method} ${req.originalUrl} not found`,
        404,
      ),
    );
  });
  app.use(errorHandler);
  return app;
};

export { createApp };
