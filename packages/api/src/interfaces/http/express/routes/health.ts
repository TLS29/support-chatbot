import { Router } from "express";
import { isShuttingDown } from "#infrastructure/observability/lifecycle";

import { env } from "#infrastructure/config/env";
import { logger } from "#infrastructure/config/logger";

export function createHealthRouter(): Router {
  const router = Router();

  router.get("/live", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  router.get("/ready", async (_req, res) => {
    if (isShuttingDown()) {
      return res.status(503).json({ status: "shutting_down" });
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${env.chromaUrl}/api/v1/heartbeat`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.error(
          { status: response.status },
          "Chroma health check failed with non-OK status",
        );
        return res.status(503).json({
          status: "error",
          detail: "ChromaDB is not responding correctly",
        });
      }

      logger.info("Chroma health check OK");
      return res.status(200).json({ status: "ready" });
    } catch (err) {
      logger.error({ err }, "Chroma health check failed");
      return res.status(503).json({
        status: "error",
        detail: "ChromaDB is unreachable or timed out",
      });
    }
  });

  return router;
}
