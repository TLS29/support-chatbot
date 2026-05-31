# Epic 02 — RAG (Retrieval-Augmented Generation)

**Estimación:** 5-7 días.

> ⚠️ **Antes de empezar esta épica, vuelve a la conversación de claude.ai donde planificamos este proyecto.** El concepto de RAG se explica mejor leyendo que en terminal, y queremos que tengas el modelo mental claro antes de implementar.

## Goal

Que el chatbot pueda responder preguntas sobre un negocio específico usando una base de conocimiento (FAQ, docs, info de productos) que le proveas. Ya no inventará respuestas — buscará en los documentos del cliente, le pasará el contexto al LLM, y el LLM responderá basándose en esa info.

**Esta es la épica más importante del proyecto.** Es el patrón que vas a aplicar en TODOS los gigs de soporte que vendas.

## Conceptos cubiertos

- **Embeddings**: convertir texto en vectores numéricos que capturan significado.
- **Vector database**: dónde guardar esos vectores para buscarlos rápido.
- **Búsqueda semántica**: encontrar fragmentos relevantes por significado, no por palabras exactas.
- **Chunking**: cómo partir documentos grandes en pedazos del tamaño correcto.
- **Context injection**: cómo pegar los fragmentos relevantes al prompt antes de llamar al LLM.
- **Clean Architecture aplicada**: refactorizar el código de las épicas anteriores a capas separadas (domain / application / infrastructure).

## Pre-requisitos

- Epic 01 completa.
- Haber leído/conversado el concepto de RAG en la conversación de claude.ai (importante).
- Docker corriendo en tu máquina (para Chroma).

## Tickets

### 02.1 — Refactor a Clean Architecture

Antes de agregar complejidad, refactoriza el código de Epic 01 a una estructura de capas:

```
src/
├── domain/             ← entidades del dominio (Message, Conversation, KnowledgeChunk)
├── application/        ← casos de uso (SendMessageUseCase)
├── infrastructure/     ← adapters (GeminiLLMProvider, GeminiEmbeddingProvider, ChromaKnowledgeRepository)
└── interfaces/
    └── cli/            ← REPL de consola actual
```

**Concepto clave:** en Epic 01 todo vivía en `index.ts`. Eso fue intencional para no sobre-ingeniar. Ahora que vas a meter embeddings + vector DB + búsqueda, sin Clean Arch el archivo se vuelve inmanejable. **Acabas de sentir el dolor que Clean Arch resuelve** — guardátelo mentalmente, es la lección más importante de esta épica.

**Bonus práctico para tu situación:** abstraer el LLM detrás de una interface `LLMProvider` es lo que va a hacer que, el día que tengas ingresos y quieras migrar a Claude (Anthropic), el cambio sea de minutos: solo creás un `AnthropicLLMProvider` que implementa la misma interface y lo intercambias en el composition root. El resto del código no se entera.

**Deep-dive a Claude Code:** _"Refactoriza el código actual a una estructura Clean Architecture con domain/application/infrastructure/interfaces. La conversación y los mensajes van en domain. La llamada al LLM se vuelve un adapter en infrastructure (LLMProvider interface en domain, GeminiLLMProvider en infrastructure). El caso de uso 'enviar mensaje' va en application. El REPL actual se mueve a interfaces/cli."_

### 02.2 — Preparar documentos de demo

Crea una carpeta `docs/` en la raíz del proyecto con documentos de un negocio ficticio (sugerencia: la misma pizzería de Epic 01). Mínimo 5 archivos `.md`:

- `menu.md` — productos y precios
- `horarios.md` — horarios de atención
- `envios.md` — políticas de envío y zonas
- `pagos.md` — métodos de pago aceptados
- `contacto.md` — info de contacto y redes

**Concepto clave:** estos son los "documentos del cliente" en un caso real. La calidad de las respuestas del bot depende directamente de la calidad de estos documentos. Esto es algo que vas a tener que enseñarle a tus clientes de Fiverr: si su info está mal escrita o incompleta, el bot va a ser malo.

### 02.3 — Chunking de documentos

Implementa una función que tome un documento de texto y lo parta en "chunks" (fragmentos) de tamaño manejable. Estrategia simple: partir por párrafos, asegurando que cada chunk tenga entre 100 y 500 caracteres.

**Concepto clave:** los embeddings tienen un límite de tokens. Documentos enteros no caben. Y aunque cupieran, buscar "el chunk relevante" es mucho más preciso que buscar "el documento relevante". El tamaño del chunk es un tradeoff: chunks chicos = más precisión + menos contexto en cada uno; chunks grandes = más contexto + menos precisión.

**Deep-dive a Claude Code:** _"Implementa una función chunkText(text: string, maxSize: number): string[] que parta texto en chunks respetando límites de párrafo cuando es posible. Si un párrafo solo es más grande que maxSize, pártelo por oraciones. Tests unitarios opcionales pero recomendados."_

### 02.4 — Embeddings con Gemini

Buena noticia: Gemini también ofrece embeddings gratis en el mismo SDK que ya tienes instalado. No necesitas SDK adicional ni segunda API key.

Modelo recomendado: `gemini-embedding-001` (general availability, free tier).

Implementa una interface `EmbeddingProvider` en `domain/` con un método `embed(text: string): Promise<number[]>`, y una implementación `GeminiEmbeddingProvider` en `infrastructure/`:

```ts
const result = await ai.models.embedContent({
  model: 'gemini-embedding-001',
  contents: text
});
// result.embeddings[0].values es el vector (array de números)
```

**Concepto clave:** un "embedding" es un vector de números que representa el significado de un texto. Dos textos con significado parecido tienen vectores cercanos en el espacio vectorial. Por eso "¿hacen envíos a Monterrey?" y "envíos a Nuevo León" se encuentran como similares aunque no compartan palabras exactas.

**Deep-dive a Claude Code:** _"Crea la interface EmbeddingProvider en domain/ con un método embed(text). Implementa GeminiEmbeddingProvider en infrastructure/ usando el método embedContent del cliente @google/genai ya configurado (misma instancia que usás para el LLM). Modelo: gemini-embedding-001. Maneja errores como en Epic 01."_

### 02.5 — Vector store con Chroma

Levanta Chroma vía Docker:

```
docker run -d --name chroma -p 8000:8000 chromadb/chroma
```

Instala el cliente JS: `pnpm add chromadb`.

Implementa un repositorio `KnowledgeRepository` (interface en domain, implementación en infrastructure) con dos métodos:

- `add(chunks: { text: string; embedding: number[]; metadata: { source: string } }[]): Promise<void>`
- `search(queryEmbedding: number[], topK: number): Promise<{ text: string; metadata: any; score: number }[]>`

**Concepto clave:** Chroma es una base de datos diseñada para buscar vectores por proximidad. Le das un vector y te devuelve los K vectores más cercanos (los K chunks más relevantes a tu query). No hace nada mágico — es matemática de distancia (coseno o euclideana) sobre vectores.

**Deep-dive a Claude Code:** _"Define KnowledgeRepository interface en domain/. Implementa ChromaKnowledgeRepository en infrastructure/ usando el cliente de chromadb. Crea una colección llamada 'support-knowledge' si no existe. Implementa add() y search(). El search debe devolver score de similitud junto con cada resultado."_

### 02.6 — Script de ingesta

Crea un script `scripts/ingest.ts` que se invoca con `pnpm ingest` y:

1. Lee todos los archivos `.md` de `docs/`.
2. Los parte en chunks (función del ticket 02.3).
3. Genera embedding para cada chunk (servicio del ticket 02.4).
4. Los inserta en Chroma con metadata (`source: 'menu.md'`, etc.).

Imprime progreso en consola: cuántos archivos, cuántos chunks generados, cuántos insertados.

**Concepto clave:** la ingesta es un proceso separado del runtime del chatbot. La haces una vez al inicio (o cuando el cliente actualice sus docs). El chatbot solo hace búsquedas — no genera embeddings cada vez.

**Cuidado con el rate limit:** generar embeddings para muchos chunks puede pegarte contra los ~15 req/min del free tier. Si tenés muchos chunks, agregá un pequeño `setTimeout` entre cada embedding (~4 segundos) o procesalos en lotes con pausa entre lotes.

**Deep-dive a Claude Code:** _"Crea scripts/ingest.ts que lea todos los archivos .md de docs/, los chunkee, genere embeddings con GeminiEmbeddingProvider, y los inserte en Chroma. Imprime progreso. Agregá un delay de ~4 segundos entre embeddings para respetar el rate limit del free tier de Gemini. Agregá 'ingest': 'tsx scripts/ingest.ts' a package.json."_

### 02.7 — Integrar búsqueda al flujo del chatbot

Modifica el caso de uso `SendMessageUseCase`:

1. Genera embedding del mensaje del usuario.
2. Busca top-3 chunks relevantes en Chroma.
3. Pega esos chunks a la system instruction como contexto.
4. Llama al LLM con la system instruction enriquecida.

Estructura sugerida de la system instruction:

```
Eres el bot de soporte de Pizzería La Italiana.

INFORMACIÓN RELEVANTE:
---
[chunk 1]
---
[chunk 2]
---
[chunk 3]
---

INSTRUCCIONES:
- Responde SOLO usando la INFORMACIÓN RELEVANTE.
- Si la pregunta no se puede contestar con esa info, di "no tengo esa información, déjame conectarte con un humano".
- No inventes datos. No alucines. Si no estás 100% seguro, di que no sabes.
```

Agrega un modo debug (variable de entorno `DEBUG=true`) que imprima en consola los chunks recuperados antes de la respuesta, para verificar que la búsqueda funciona bien.

**Concepto clave:** esto es RAG en su forma más pura. Buscas, inyectas, generas. El LLM no "sabe" del negocio — solo razona sobre el contexto que le pasaste.

**Deep-dive a Claude Code:** _"Modifica SendMessageUseCase para que: 1) genere embedding del mensaje del usuario, 2) busque top-3 chunks en KnowledgeRepository, 3) construya una system instruction que incluya esos chunks como contexto, 4) llame al LLMProvider con esa system instruction enriquecida. Si DEBUG=true, imprime los chunks recuperados con sus scores antes de la respuesta."_

### 02.8 — Manejo de "no sé" y threshold de similitud

Prueba el bot. Verifica que:

- Cuando preguntas algo que SÍ está en los docs (precios, horarios, etc.), responde correctamente.
- Cuando preguntas algo que NO está en los docs (ej. "¿quién es el presidente de México?"), dice "no tengo esa información".

Si está alucinando (inventando respuestas), refuerza la system instruction y agrega un threshold de similitud: si el score del top result es menor a 0.3 (ajusta según veas), no llames al LLM — devuelve directamente "no tengo esa información".

**Concepto clave:** este es **el problema #1** que vas a resolver para tus clientes de Fiverr. Un bot que alucina es peor que no tener bot. Hay varias técnicas combinadas: instrucciones fuertes en la system instruction + threshold de similitud + opcionalmente, validación posterior.

**Deep-dive a Claude Code:** _"Refuerza la system instruction para reducir alucinaciones (instrucciones más estrictas). Adicionalmente, implementa un threshold: si el score del top result es menor a 0.3, no llames al LLM — devuelve directamente 'no tengo esa información, ¿quieres que te conecte con un humano?'. Imprime el score en modo debug para calibrar."_

## Definition of Done

- [ ] Código refactorizado a Clean Architecture (capas separadas, dependencias en orden correcto: domain no importa nada, application solo de domain, infrastructure de ambas)
- [ ] 5+ documentos de demo cargados en `docs/`
- [ ] `pnpm ingest` corre y mete todo en Chroma sin error
- [ ] El bot responde correctamente preguntas que SÍ están en los docs (menú, horarios, etc.)
- [ ] El bot dice "no sé" para preguntas que NO están en los docs
- [ ] Modo `DEBUG=true` muestra los chunks recuperados (verificación visual de que la búsqueda es razonable)
- [ ] Commits por ticket

## Lo que aprendiste

- Qué son embeddings y cómo capturan significado.
- Cómo funciona una vector DB (distancia entre vectores).
- Patrón completo de RAG: chunk → embed → store → query embed → search → inject → generate.
- Clean Architecture aplicada a un caso real (no académico).
- Por qué una buena system instruction + buenos docs + threshold de similitud > simplemente un LLM más grande.
- Cómo abstraer providers detrás de interfaces para poder cambiar de Gemini a Claude (Anthropic) o cualquier otro en el futuro sin tocar la lógica de negocio.

## Trampas comunes

- Chunks demasiado grandes → pierdes precisión en la búsqueda (un chunk gigante "matchea" todo).
- Chunks demasiado chicos → pierdes contexto (el LLM ve fragmentos sin coherencia).
- Olvidar la metadata al insertar → luego no sabes de qué doc viene la respuesta.
- No re-ingestar después de actualizar los docs → el bot responde con info vieja.
- Hardcodear el contexto en la system instruction en lugar de inyectarlo dinámicamente → perdés la magia de RAG.
- Confiar en que el LLM "no inventará" solo porque le dijiste en la system instruction. Necesitás **instrucciones fuertes Y threshold de similitud**. Es defense in depth.
- No probar con preguntas off-topic deliberadamente. El bot debería decir "no sé" — si responde igual con confianza, está alucinando.
- Hacer la ingesta sin delay entre embeddings → te tira `429 Too Many Requests` a mitad del proceso y te toca volver a empezar.
