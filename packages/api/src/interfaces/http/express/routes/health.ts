import { Router } from "express";
import { isShuttingDown } from "#infrastructure/observability/lifecycle";

export function createHealthRouter(): Router {
  const router = Router();

  router.get("/live", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  router.get("/ready", (_req, res) => {
    if (isShuttingDown())
      return res.status(503).json({ status: "shutting_down" });
    // TODO(epic-02): verificar conexión a Chroma acá
    res.status(200).json({ status: "ready" });
  });

  return router;
}
