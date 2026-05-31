# chatbot-soporte

Chatbot de soporte al cliente con IA (RAG), construido en Node.js + TypeScript. Diseñado como pieza de portafolio para ofrecer integración de chatbots como servicio en Fiverr.

## Objetivo

Al terminar las 5 épicas tendrás un demo público funcionando que puedas mostrar a clientes potenciales: un widget de chat que responde sobre el negocio del cliente usando RAG (Retrieval-Augmented Generation) sobre sus propios documentos.

## Stack

- Node.js 20 + TypeScript (strict)
- pnpm como package manager
- `@google/genai` — SDK unificado de Google Gen AI (Gemini)
- Modelo LLM: `gemini-2.5-flash` (free tier)
- Modelo de embeddings: `gemini-embedding-001` (free tier)
- Chroma como vector DB local (Docker) — se agrega en Epic 02
- Express + frontend a definir en Epic 03

**Nota sobre la elección de Gemini vs Claude:** la decisión de usar Gemini en lugar de Claude (Anthropic) es 100% por costo durante la fase de aprendizaje. Gemini tiene free tier real sin tarjeta de crédito; Anthropic ya no autogarantiza crédito gratis al registrarse. Como en Epic 02 abstraemos el LLM detrás de una interface (`LLMProvider`), migrar a Claude en el futuro es un cambio de minutos: solo se crea otro adapter que implementa la misma interface.

## Cómo trabajar

1. Lee `epics/README.md` para ver el plan completo.
2. Cada épica tiene su propio README con tickets numerados.
3. Para cada ticket, abre Claude Code CLI en VS Code y pídele que profundice ese ticket específico (los `.md` son intencionalmente conceptuales, no specs línea por línea).
4. Al terminar cada ticket: commit (`feat: ...`).
5. Al terminar una épica: tachar el Definition of Done y push.
6. **No saltes épicas.** El orden está pensado para que cada una se monte encima de la anterior.

## Pre-requisitos

- Node 20+ y pnpm instalados.
- Cuenta en Google AI Studio (https://aistudio.google.com/app/apikey) con API key generada — gratis, sin tarjeta de crédito.
- VS Code con Claude CLI configurado.
- Docker Desktop (necesario desde Epic 02 para Chroma).

## Una nota importante sobre RAG

El concepto de RAG (Epic 02) se explica mejor leyendo que escribiendo en terminal. Cuando llegues a esa épica, vuelve a la conversación de claude.ai donde planificamos este proyecto para tener la explicación conceptual antes de implementar. El README de Epic 02 lo recuerda también.
