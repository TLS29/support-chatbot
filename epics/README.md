# Índice de épicas

Las épicas están diseñadas para hacerse en orden. Cada una asume que las anteriores están completas.

## Mapa de dependencias

```
Epic 00 (Foundation & Hygiene)
   Monorepo + Clean Arch + Express + Pino + Zod + Docker + healthchecks + graceful shutdown
    │
    ▼
Epic 01 (LLM API endpoint)
   POST /api/chat con use case + provider + sesiones + streaming + rate limit
    │
    ▼
Epic 02 (RAG) ← el corazón del producto
   Embeddings + Chroma + ingesta + threshold + shared types
    │
    ▼
Epic 03 (Widget React + assistant-ui)
   Vite + React + assistant-ui + iframe + Custom Runtime + loader vanilla
    │
    ▼
Epic 04 (Deploy + handover)
   DigitalOcean + docker-compose multi-service + Caddy + handover doc + Fiverr
```

## Listado

| # | Épica | Foco | Tiempo |
|---|-------|------|--------|
| 00 | Foundation & Hygiene | Monorepo + Clean Arch + production-grade API base | 3-4 días |
| 01 | LLM API endpoint | POST /api/chat con streaming, memoria, rate limit | 2-3 días |
| 02 | **RAG** | Embeddings + Chroma + ingesta + threshold | 4-5 días |
| 03 | Widget React + assistant-ui | Frontend embebible profesional vía iframe | 3-4 días |
| 04 | Deploy + handover | DigitalOcean + Caddy + handover + Fiverr listing | 2-3 días |

**Total estimado:** ~3 semanas de trabajo concentrado.

## Cómo trabajar una épica

1. Lee el README de la épica entera antes de empezar.
2. Confirma los pre-requisitos.
3. Para cada ticket, abre Claude Code CLI y pídele que profundice. Los `.md` son intencionalmente conceptuales, no specs.
4. Al terminar cada ticket: commit con conventional commits con scope del package.
5. Al terminar la épica: tachar Definition of Done y push.

## Convención de commits para monorepo

Usa scope con el nombre del package:

- `feat(api): add error handler`
- `feat(widget): wire custom runtime`
- `feat(shared): add ChatRequest type`
- `chore(root): update docker-compose`
- `docs(epic-02): clarify chunking strategy`

## Notas importantes

- **Monorepo desde el día 1.** El proyecto usa `pnpm workspaces` con 3 packages: `api`, `widget`, `shared`. El primer ticket de Epic 00 te guía en el setup completo.
- **Clean Architecture desde el día 1** en `packages/api`. Hay un guardrail automático (`dependency-cruiser`) que falla el lint si rompes la regla de dependencia.
- **No hay "hello world"** al inicio. El primer call a Gemini ocurre dentro del endpoint POST /api/chat en Epic 01.
- **El concepto de RAG se explica en la conversación de claude.ai**, no en este README. Cuando llegues a Epic 02, vuelve allí.
- **Widget = React + assistant-ui + iframe.** No vanilla JS. La razón está explicada en Epic 03.
- **Vendible desde día 1.** Cada decisión arquitectónica está orientada a "esto lo voy a entregar a un cliente real".
- **Reutilización entre gigs.** Al terminar este proyecto, el repo es tu template privado.
