# Índice de épicas

Las épicas están diseñadas para hacerse en orden. Cada una asume que las anteriores están completas.

## Mapa de dependencias

```
Epic 00 (Setup)
    │
    ▼
Epic 01 (Conversación con LLM)
    │
    ▼
Epic 02 (RAG) ← refactor a Clean Arch + corazón del proyecto
    │
    ▼
Epic 03 (Frontend widget)
    │
    ▼
Epic 04 (Deploy + demo público)
```

## Listado

| # | Épica | Foco | Tiempo estimado |
|---|-------|------|-----------------|
| 00 | Setup | TS strict, SDK de Anthropic, "hello world" al LLM | 1 día |
| 01 | Conversación con LLM | Llamada básica, memoria, system prompt, streaming | 3-4 días |
| 02 | **RAG** | Embeddings, vector store, búsqueda semántica, Clean Arch | 5-7 días |
| 03 | Frontend widget | UI de chat, streaming, embebible vía script tag | 3-4 días |
| 04 | Deploy + demo | Hosting, demo público, README de portafolio | 2-3 días |

**Total estimado:** 2-3 semanas de trabajo concentrado.

## Cómo trabajar una épica

1. Lee el README de la épica entera antes de empezar.
2. Confirma que cumples los pre-requisitos.
3. Para cada ticket, abre Claude Code CLI en VS Code y pídele que te ayude con ese ticket específico. Los `.md` son intencionalmente conceptuales, no specs.
4. Al terminar cada ticket: commit con conventional commits (`feat(conversation): add system prompt`).
5. Al terminar la épica: tachar el Definition of Done y push.
6. Pasa a la siguiente solo cuando el DoD esté 100% verde.

## Notas importantes

- **Clean Architecture entra en Epic 02**, no antes. En las épicas 00-01 escribes código plano (todo en `index.ts` o pocos archivos). Cuando agregues RAG y empiece a doler, refactorizas a Clean Arch — vas a entender *por qué* sirve mucho mejor habiendo sentido el dolor.
- **El concepto de RAG se explica en la conversación de claude.ai**, no en este README. Cuando llegues a Epic 02, vuelve allí para entender el modelo mental antes de implementar.
- **Costos:** las épicas 00-03 las haces gastando entre $0 y $3 USD. El gasto serio aparece solo cuando tengas clientes con tráfico real.
