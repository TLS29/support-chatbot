# Epic 02 — RAG (Retrieval-Augmented Generation)

**Estimación:** 4-5 días.

> ⚠️ **Antes de empezar, vuelve a la conversación de claude.ai donde planificamos este proyecto.** El concepto de RAG (búsqueda semántica, embeddings, vector DB) se explica mejor leyendo que en terminal. Ahí cubrimos el modelo del "mapa de significados", por qué keyword search no sirve, embeddings, similitud coseno, y el ciclo retrieve → augment → generate.

## Goal

Que el chatbot pueda responder preguntas sobre un negocio específico usando una base de conocimiento. Ya no inventa — busca en los documentos del cliente, le pasa el contexto al LLM, el LLM responde basándose en esa info.

**Esta es la épica más importante del proyecto.** Es el patrón que vas a aplicar en TODOS los gigs.

## Conceptos cubiertos

- **Chunking**: cómo partir documentos en pedazos del tamaño correcto.
- **Embeddings**: convertir texto en vectores que capturan significado.
- **Vector database** (Chroma): dónde guardar vectores para buscarlos rápido.
- **Búsqueda semántica**: encontrar fragmentos relevantes por significado.
- **Context injection**: cómo pegar fragmentos al system prompt antes de llamar al LLM.
- **Threshold de similitud**: cuándo decir "no sé".

## Pre-requisitos

- Epic 01 completa (POST /api/chat funcionando con streaming).
- Docker corriendo (necesario para Chroma).

## Tickets

### 02.1 — Chroma en docker-compose + health check

Agrega al `docker-compose.yml` raíz un nuevo servicio:

```yaml
chroma:
  image: chromadb/chroma
  ports: ["8000:8000"]   # en prod cambiamos a "expose" — ver Epic 04
  volumes:
    - chroma-data:/chroma/chroma
  restart: unless-stopped

volumes:
  chroma-data:
```

También agrega `depends_on: [chroma]` al servicio `api`.

Agrega `CHROMA_URL` al schema de env (default `http://localhost:8000` para dev fuera de docker; en docker-compose usa `http://chroma:8000`).

**Refactoriza `GET /health/ready`** para que ahora SÍ chequee Chroma — ese era el TODO de Epic 00. Si Chroma no responde en < 2s → 503 con detalle. Si OK → 200.

**Deep-dive a Claude Code:** _"Agrega servicio chroma a docker-compose.yml raíz con volumen persistente y depends_on para api. Agrega CHROMA_URL a packages/api/src/infrastructure/config/env.ts. Refactoriza GET /health/ready para chequear heartbeat de Chroma con timeout 2s, devolver 503 con detalle si falla, 200 si OK. Loggea cada chequeo."_

### 02.2 — Documentos de demo

Crea `docs/` en la raíz del repo (al nivel del `packages/`). Mínimo 5 archivos `.md` con info de pizzería ficticia:

- `menu.md` — productos y precios concretos
- `horarios.md` — horarios de atención
- `envios.md` — políticas y zonas de envío
- `pagos.md` — métodos de pago
- `contacto.md` — info de contacto y redes

Llena cada uno con info inventada pero realista (precios específicos, zonas con nombre, horarios precisos).

**Concepto clave:** la calidad de las respuestas del bot depende directamente de la calidad de estos docs. Esto es lo que vas a tener que enseñarle a clientes de Fiverr.

### 02.3 — Chunking

`packages/api/src/infrastructure/rag/chunker.ts`.

Función `chunkText(text: string, maxSize: number = 500): string[]` que parte respetando límites de párrafo. Si un párrafo solo es más grande que `maxSize`, parte por oraciones.

**Concepto clave:** chunks muy grandes pierden precisión; muy chicos pierden contexto. Para FAQs/info de negocio, 200-500 chars suele funcionar bien.

**Deep-dive a Claude Code:** _"Implementa chunkText(text, maxSize) en packages/api/src/infrastructure/rag/chunker.ts. Respeta párrafos. Si párrafo > maxSize, parte por oraciones. Tests unitarios cubriendo: párrafos cortos, párrafos largos, edge cases (vacío, palabra única muy larga)."_

### 02.4 — Embeddings con Gemini

Define interface en `packages/api/src/domain/rag/embedding-provider.ts`:
```ts
interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
}
```

Implementa `GeminiEmbeddingProvider` en `packages/api/src/infrastructure/rag/`. Usa el SDK que ya tienes:

```ts
const result = await ai.models.embedContent({
  model: 'gemini-embedding-001',
  contents: text
});
return result.embeddings[0].values;
```

Errores: 429 → `EmbeddingRateLimitError`; otros → `EmbeddingUnavailableError` (en `packages/api/src/domain/rag/errors.ts`).

**Concepto clave:** un embedding es un vector que representa significado. Dos textos similares en significado → vectores cercanos. La interface en domain te permite cambiar de Gemini a Voyage/OpenAI/local sin tocar el resto.

**Deep-dive a Claude Code:** _"Crea EmbeddingProvider interface en packages/api/src/domain/rag/. Implementa GeminiEmbeddingProvider en packages/api/src/infrastructure/rag/ usando el GoogleGenAI existente. Modelo gemini-embedding-001. EmbeddingRateLimitError + EmbeddingUnavailableError en packages/api/src/domain/rag/errors.ts."_

### 02.5 — KnowledgeRepository con Chroma

```bash
pnpm --filter api add chromadb
```

Interface en `packages/api/src/domain/rag/knowledge-repository.ts`:
```ts
type KnowledgeChunk = { text: string; embedding: number[]; metadata: { source: string } };
type KnowledgeSearchResult = { text: string; metadata: { source: string }; score: number };

interface KnowledgeRepository {
  add(chunks: KnowledgeChunk[]): Promise<void>;
  search(queryEmbedding: number[], topK: number): Promise<KnowledgeSearchResult[]>;
}
```

Implementa `ChromaKnowledgeRepository` en `packages/api/src/infrastructure/rag/`:
- Conecta a `env.CHROMA_URL`.
- Crea (si no existe) colección `support-knowledge`.
- `add` inserta chunks con embeddings + metadata.
- `search` hace nearest-neighbor con cosine similarity. Score = `1 - distance`.

**Deep-dive a Claude Code:** _"Define KnowledgeRepository en packages/api/src/domain/rag/. Implementa ChromaKnowledgeRepository en packages/api/src/infrastructure/rag/ usando chromadb. Colección support-knowledge. add/search. score = 1 - distance. Errores con DomainError correspondiente."_

### 02.6 — Script de ingesta

Crea `scripts/ingest.ts` (en raíz del repo, fuera de packages).

Configura para que corra en el contexto del api package. Agrega al `packages/api/package.json`:
```json
"ingest": "tsx ../../scripts/ingest.ts"
```

Desde raíz: `pnpm ingest` (delega).

El script:
1. Lee todos los `.md` de `docs/`.
2. Chunkea cada uno (función del 02.3).
3. Por cada chunk: genera embedding (02.4), **delay ~4s** entre cada uno para no pegar el rate limit.
4. Inserta en Chroma (02.5) con metadata `{ source: 'menu.md' }`.

Imprime progreso (archivo X de Y, chunk N de M).

**Concepto clave:** la ingesta es proceso separado del runtime. La haces una vez (o cuando el cliente actualice sus docs). El chatbot solo hace búsquedas.

**Cuidado:** sin el delay de 4s te tira 429 a mitad del proceso.

**Deep-dive a Claude Code:** _"Crea scripts/ingest.ts en raíz del repo. Lee docs/, chunkea, genera embeddings con GeminiEmbeddingProvider con delay 4s entre cada uno, inserta en Chroma con metadata source. Imprime progreso. Agrega 'ingest': 'tsx ../../scripts/ingest.ts' a packages/api/package.json."_

### 02.7 — Integrar RAG al SendMessageUseCase

Modifica `packages/api/src/application/send-message-use-case.ts`:

Constructor agrega:
- `embeddingProvider: EmbeddingProvider`
- `knowledgeRepository: KnowledgeRepository`

En `execute`, antes de llamar al LLM:
1. Embed del mensaje del usuario.
2. Search top-3 chunks.
3. Construye system instruction enriquecida:

```
{SYSTEM_PROMPT_BASE}

INFORMACIÓN RELEVANTE:
---
{chunk 1}
---
{chunk 2}
---
{chunk 3}
---

INSTRUCCIONES:
- Responde SOLO con la INFORMACIÓN RELEVANTE.
- Si no se puede contestar con esa info, di "no tengo esa información, déjame conectarte con un humano".
- No inventes. Si no estás 100% seguro, di que no sabes.
```

4. Llama LLM con esa system instruction enriquecida.

Modo debug (controlado por `env.LOG_LEVEL=debug`) imprime chunks recuperados con scores.

**Deep-dive a Claude Code:** _"Modifica SendMessageUseCase para inyectar embeddingProvider y knowledgeRepository. En execute, antes del LLM: embed del mensaje, search top-3, construye system instruction enriquecida con chunks + instrucciones anti-alucinación, llama LLM con esa instruction. Loggea chunks recuperados con scores en log level debug."_

### 02.8 — Threshold de similitud

Agrega `SIMILARITY_THRESHOLD` al env (default 0.3).

En el use case, después de search: si top score < threshold, **no llames al LLM**. Yields directamente: *"No tengo esa información, déjame conectarte con un humano."*

**Concepto clave:** este es **el problema #1** para clientes de Fiverr. Defense in depth: instrucciones fuertes + threshold + opcional validación posterior.

**Deep-dive a Claude Code:** _"Agrega SIMILARITY_THRESHOLD a env (default 0.3). En SendMessageUseCase, después de search: si top score < threshold, no llames al LLM — yields el mensaje 'no tengo esa información' directamente. Loggea cuándo dispara el short-circuit (debug)."_

## Definition of Done

- [ ] Chroma corre en docker-compose y `/health/ready` lo chequea real
- [ ] 5+ documentos demo en `docs/`
- [ ] `pnpm ingest` corre completo sin error
- [ ] `POST /api/chat` con preguntas en los docs → responde con info correcta
- [ ] `POST /api/chat` con preguntas fuera de los docs → "no sé"
- [ ] Threshold funciona (verificar con preguntas borderline)
- [ ] Log level debug muestra chunks recuperados con scores
- [ ] `pnpm lint:deps` sigue pasando
- [ ] Commits por ticket

## Lo que aprendiste

- Patrón completo de RAG: chunk → embed → store → query embed → search → inject → generate.
- Por qué un buen system prompt + buenos docs + threshold > simplemente un LLM más grande.
- Cómo abstraer providers detrás de interfaces para poder cambiar después.

## Trampas comunes

- Chunks demasiado grandes/chicos → precisión vs contexto.
- Olvidar metadata al insertar → no sabes de qué doc viene la respuesta.
- No re-ingestar después de actualizar docs → info vieja.
- Confiar solo en system instruction para evitar alucinaciones → necesitas threshold además.
- No probar preguntas off-topic deliberadamente.
- Ingesta sin delay entre embeddings → 429 a mitad del proceso.
