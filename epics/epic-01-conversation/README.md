# Epic 01 — LLM API endpoint

**Estimación:** 2-3 días.

## Goal

Tener `POST /api/chat` funcionando end-to-end: recibe un mensaje del usuario, mantiene memoria de conversación por sesión, llama a Gemini con system prompt + historial, y stream-ea la respuesta al cliente.

Al final, **cualquier cliente HTTP (curl, Postman, futuro widget) puede tener una conversación real con tu bot**.

## Conceptos cubiertos

- **Domain entities**: Message, Conversation.
- **Provider abstraction**: el LLM detrás de una interface, no acoplado a Gemini.
- **Use case pattern**: lógica de negocio en `application/`, sin dependencias de framework.
- **Shared types**: contratos HTTP en `packages/shared/` para reusar en el widget (Epic 03).
- **Streaming HTTP responses** desde Express.
- **Session memory** in-memory.
- **Rate limiting**: protección contra abuso + respeto al free tier de Gemini.

## Pre-requisitos

- Epic 00 completa (monorepo + Express base + Pino + zod operativos).

Buena noticia: el system prompt que escribiste en `packages/api/src/_scratch.ts` (Pizzería La Italiana, anti-alucinación) **lo vamos a reusar**. Tenlo a mano.

## Tickets

### 01.1 — Shared types: contratos HTTP

En `packages/shared/src/`:

```
shared/src/
├── chat-message.ts    → type ChatRole = 'user' | 'model'; type ChatMessage { role; text }
├── api-contract.ts    → type ChatRequest { sessionId: string; message: string }
└── index.ts           → re-export de los anteriores
```

**Concepto clave:** los tipos en `shared/` son **contratos HTTP** (DTOs). NO son las entidades del dominio del API — esas viven en `packages/api/src/domain/` y son privadas.

¿Por qué la separación? Porque el widget (Epic 03) va a consumir `ChatRequest` para tipar su llamada al API. Si esos tipos vivieran en `packages/api/src/domain/`, el widget tendría que importar del package de api, lo cual rompe el principio de "el frontend no conoce el backend".

**Deep-dive a Claude Code:** _"Crea packages/shared/src/chat-message.ts con ChatRole y ChatMessage. packages/shared/src/api-contract.ts con ChatRequest. packages/shared/src/index.ts que reexporta todo. Documenta la diferencia entre 'shared DTOs' (en shared/) y 'domain entities' (en api/domain/)."_

### 01.2 — Domain entities + interfaces (en api)

En `packages/api/src/`:

```
domain/
├── conversation/
│   ├── message.ts             → Message del dominio (puede o no ser igual al DTO de shared)
│   ├── conversation.ts        → type Conversation { id; messages: Message[] }
│   └── session-repository.ts  → interface SessionRepository
└── llm/
    ├── llm-provider.ts        → interface LLMProvider
    └── errors.ts              → LLMRateLimitError, LLMUnavailableError (extends DomainError)
```

Nota sobre el role: usamos `'model'` (no `'assistant'`) porque es lo que Gemini usa. Si más adelante el adapter de Anthropic mapea internamente a `'assistant'`, no nos importa — el domain sigue siendo `'model'`.

**Deep-dive a Claude Code:** _"Crea Message y Conversation en packages/api/src/domain/conversation/. Interface SessionRepository (get, save, appendMessage). Interface LLMProvider con chat(messages, systemPrompt) → AsyncIterable<string>. LLMRateLimitError y LLMUnavailableError en packages/api/src/domain/llm/errors.ts extendiendo DomainError."_

### 01.3 — Infrastructure: GeminiLLMProvider

Implementa `packages/api/src/infrastructure/llm/gemini-llm-provider.ts` que satisface `LLMProvider`.

- Constructor recibe `GoogleGenAI` instance + `modelName` (default `gemini-2.5-flash-lite`).
- Mapea `Message[]` del domain → `Content[]` de Gemini (con `parts`).
- `generateContentStream` con `systemInstruction`.
- Yields chunks de texto.
- Errores: status 429 → `LLMRateLimitError`; otros → `LLMUnavailableError`.

**Concepto clave:** este adapter es lo único en todo el proyecto que sabe que usas Gemini. Mañana migras a Claude: escribes `AnthropicLLMProvider` con la misma interface y lo intercambias en el composition root.

**Deep-dive a Claude Code:** _"Implementa GeminiLLMProvider en packages/api/src/infrastructure/llm/. Constructor con DI manual (GoogleGenAI + modelName). Mapea Message[] del domain a Content[] de Gemini. generateContentStream con systemInstruction. Yields chunks. Maneja 429 → LLMRateLimitError; otros → LLMUnavailableError. Loggea con el structured logger."_

### 01.4 — Infrastructure: InMemorySessionRepository

`packages/api/src/infrastructure/sessions/in-memory-session-repository.ts`.

- `Map<string, Conversation>`.
- Métodos `get`, `save`, `appendMessage`.
- Cap de historial vía `env.MAX_HISTORY_MESSAGES` (default 40). Si excede, descarta los más viejos.

Agrega `MAX_HISTORY_MESSAGES` al schema de env.

**Deep-dive a Claude Code:** _"Implementa InMemorySessionRepository en packages/api/src/infrastructure/sessions/. Map<string, Conversation>. Cap configurable vía MAX_HISTORY_MESSAGES (agregalo a env.ts, default 40). Si excede al appendear, descarta los más viejos."_

### 01.5 — Application: SendMessageUseCase

`packages/api/src/application/send-message-use-case.ts`.

Constructor recibe (DI manual):
- `LLMProvider`
- `SessionRepository`
- `systemPrompt: string`

Método `execute({ sessionId, message }): AsyncIterable<string>`:

1. Obtiene conversación de `sessionRepository.get(sessionId)` (crea si no existe).
2. Appendea `{ role: 'user', text: message }`.
3. Llama `llmProvider.chat(historial, systemPrompt)`, yields cada chunk.
4. Acumula chunks en buffer.
5. Al cerrar el stream: `appendMessage` con `{ role: 'model', text: buffer }`.

**Concepto clave:** el use case es **lógica de negocio pura**. No sabe nada de Express, HTTP, ni Gemini. Si lo invocas desde un script CLI (sin Express), también funciona.

**Deep-dive a Claude Code:** _"Implementa SendMessageUseCase en packages/api/src/application/. Constructor con DI manual: llmProvider, sessionRepository, systemPrompt. Método execute({sessionId, message}) devuelve AsyncIterable<string>: obtiene conversación, appendea user message, llama llmProvider.chat con historial completo, yields chunks acumulando buffer, al final appendea response completo."_

### 01.6 — HTTP: zod schema + route POST /api/chat

`packages/api/src/interfaces/http/routes/chat.ts`:

1. **Schema zod** que valida el `ChatRequest` (importado de `@chatbot-soporte/shared`):
   ```ts
   import { ChatRequest } from '@chatbot-soporte/shared';
   const ChatRequestSchema = z.object({
     sessionId: z.string().uuid(),
     message: z.string().min(1).max(2000)
   }) satisfies z.ZodType<ChatRequest>;
   ```
2. **Handler**:
   - Valida con zod (lanza ZodError → error handler central → 400).
   - Llama `sendMessageUseCase.execute(...)`.
   - Headers de streaming: `Content-Type: text/plain; charset=utf-8`, `Cache-Control: no-cache`, `X-Accel-Buffering: no`.
   - `for await` el AsyncIterable y `res.write(chunk)`.
   - Al terminar: `res.end()`.
   - Si el cliente desconecta (`req.on('close')`), loggea y deja morir el stream.

Registra en `app.ts`: `app.post('/api/chat', chatRoute)`.

**Concepto clave:** el `satisfies z.ZodType<ChatRequest>` valida en compile-time que tu schema zod corresponde con el tipo TS de shared. Si cambias el contrato en shared, el schema rompe al instante.

**Deep-dive a Claude Code:** _"Crea packages/api/src/interfaces/http/routes/chat.ts. Import ChatRequest de @chatbot-soporte/shared. Define ChatRequestSchema con zod usando satisfies z.ZodType<ChatRequest> para garantizar consistencia. Handler valida, llama SendMessageUseCase, stream-ea respuesta (text/plain, no-cache, X-Accel-Buffering=no), maneja req.on('close'). Delega errores al handler central."_

### 01.7 — Rate limit middleware

```bash
pnpm --filter api add express-rate-limit
```

`packages/api/src/interfaces/http/middleware/rate-limit.ts`:
- Configurable vía `env.RATE_LIMIT_PER_MIN` (agregar al schema, default 10).
- Aplica solo a `/api/chat`, NO a healthchecks.
- Al excederse: 429 con JSON `{ error: 'too many requests' }`.
- Loggea cada vez que dispara.

**Concepto clave:** rate limit cumple dos funciones:
1. Anti-abuso.
2. **Te protege del free tier de Gemini** (15 req/min). Si un bot crawler entra, lo absorbe el middleware antes de llegar a Gemini.

**Deep-dive a Claude Code:** _"Configura express-rate-limit en packages/api/src/interfaces/http/middleware/rate-limit.ts. RATE_LIMIT_PER_MIN del env (agregalo, default 10). Aplica solo a /api/chat. 429 con JSON al exceder. Loggea trigger con structured logger."_

## Definition of Done

- [ ] `POST /api/chat` con body `{ sessionId, message }` responde streaming
- [ ] Múltiples mensajes en la misma `sessionId` recuerdan el historial
- [ ] Body inválido → 400 con detalle zod
- [ ] Gemini 429 → traducido a 5xx con mensaje friendly
- [ ] Rate limit: request 11 en 1 min misma IP → 429
- [ ] El use case se puede invocar desde un script de test sin Express y funciona — prueba de desacoplamiento
- [ ] Logs muestran correlation ID en el flujo completo
- [ ] `@chatbot-soporte/shared` exporta `ChatRequest` y `api` lo importa
- [ ] `pnpm lint:deps` sigue pasando
- [ ] Commits por ticket con scope

## Lo que aprendiste

- **Provider abstraction** real.
- **Use case pattern** desacoplado de framework.
- **Shared types entre packages** del monorepo.
- **HTTP streaming** con Express.
- **Validation en el boundary** con zod + `satisfies`.
- **DI manual** en el composition root.

## Trampas comunes

- Meter Gemini directo en el route handler → pierdes toda la abstracción.
- Validar con zod adentro del use case "por si acaso" → duplicas fuentes de verdad.
- Acumular response completo antes de mandarlo al cliente → pierdes el streaming. `res.write(chunk)` por cada chunk.
- Olvidar `Cache-Control: no-cache` → algunos proxies/browsers buffereaen todo antes del primer byte.
- No manejar `req.on('close')` → el use case sigue tokenizando para un cliente que ya se fue.
- Importar tipos del API desde shared "por ahora" → invierte la dirección de dependencia. shared NO conoce a api ni a widget.
