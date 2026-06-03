import { rateLimit } from "express-rate-limit";
import { env } from "#infrastructure/config/env";
import { logger } from "#infrastructure/config/logger";

export const chatRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: env.rateLimitPerMin,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({ ip: req.ip }, "Rate limit exceeded");
    res.status(429).json({ error: "too many requests" });
  },
});
