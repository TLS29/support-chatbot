import { Router } from "express";
import type { SendMessageUseCase } from "#application/send-message-use-case";
import { makeChatController } from "../controllers/chat.controller";

export function createChatRouter(
  sendMessageUseCase: SendMessageUseCase,
): Router {
  const router = Router();
  router.post("/", makeChatController(sendMessageUseCase));
  return router;
}
