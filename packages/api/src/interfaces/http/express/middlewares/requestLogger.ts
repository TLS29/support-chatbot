import pinoHttp from "pino-http";
import { logger } from "#infrastructure/config/logger";

export const requestLogger = pinoHttp({
  logger,
  serializers: {
    req: (req) => ({ method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});
