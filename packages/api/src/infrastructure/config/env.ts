import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  GEMINI_API_KEY: z
    .string()
    .min(10, "GEMINI_API_KEY is required and must be at least 10 characters"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  SYSTEM_PROMPT: z
    .string()
    .default(
      "Eres el bot de soporte de Pizzería La Italiana. Responde con tono amable. Si no sabes algo, di 'no tengo esa información, déjame conectarte con un humano'.",
    ),
  ALLOWED_ORIGINS: z.string().default("*"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  nodeEnv: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  geminiApiKey: parsed.data.GEMINI_API_KEY,
  logLevel: parsed.data.LOG_LEVEL,
  systemPrompt: parsed.data.SYSTEM_PROMPT,
  allowedOrigins: parsed.data.ALLOWED_ORIGINS,
} as const;

export type Env = typeof env;
