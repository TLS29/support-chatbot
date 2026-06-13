import type { NextFunction, Request, Response } from "express";
import { RequestContext } from "#infrastructure/observability/requestContext";
import { logger } from "#infrastructure/config/logger";
import { randomUUID } from "node:crypto";

const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const CORRELATION_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;
  let correlationId: string;

  const incoming = req.header("x-correlation-id");
  if (incoming && CORRELATION_ID_PATTERN.test(incoming)) {
    correlationId = incoming;
  } else {
    if (incoming) {
      logger.warn({ incoming }, "Invalid X-Correlation-Id header, generating new one");
    }

    correlationId = randomUUID();
  }

  res.setHeader("x-correlation-id", correlationId);
  RequestContext.runWithContext({ correlationId }, () => {
    next();
  });
};

export { correlationIdMiddleware };
