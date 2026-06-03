import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import type { ChatRequest } from "@support-chatbot/shared";
import type { SendMessageUseCase } from "#application/send-message-use-case";
import { logger } from "#infrastructure/config/logger";

const ChatRequestSchema = z.object({
  sessionId: z.uuid(),
  message: z.string().min(1).max(2000),
}) satisfies z.ZodType<ChatRequest>;

export function makeChatController(sendMessageUseCase: SendMessageUseCase) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Validación de forma en el boundary HTTP.
    const { sessionId, message } = ChatRequestSchema.parse(req.body);

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no");

    let clientGone = false;
    res.on("close", () => {
      if (res.writableEnded) return;
      clientGone = true;
      logger.info({ sessionId }, "Client disconnected, stopping stream");
    });

    try {
      for await (const chunk of sendMessageUseCase.execute({
        sessionId,
        message,
      })) {
        if (clientGone) break;
        res.write(chunk);
      }
      res.end();
    } catch (err) {
      if (res.headersSent) {
        logger.error({ err }, "Stream failed after response started");
        res.end();
      } else {
        next(err);
      }
    }
  };
}
