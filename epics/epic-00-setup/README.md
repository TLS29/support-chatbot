# Epic 00 — Foundation & Hygiene

**Estimación:** 3-4 días.

## Goal

Levantar la base production-grade del proyecto **como monorepo con pnpm workspaces**, desde un repo vacío. Al final tienes un servidor Express corriendo en `localhost:3000` con:

- Estructura de monorepo con 3 packages: `api`, `widget` (placeholder), `shared`.
- Clean Architecture en `packages/api` con 4 capas y un lint rule que falla si rompes la regla.
- Config validada con zod al boot (fail-fast).
- Logger estructurado (Pino) + correlation ID automático.
- Error handler central que distingue tipos de error.
- Healthchecks `/health/live` y `/health/ready`.
- Graceful shutdown ante SIGTERM.
- Dockerfile multi-stage para monorepo + docker-compose.

**NO hay endpoint funcional de chat todavía** — esa es Epic 01. Esta épica es la plomería sobre la cual va a vivir todo lo demás.

## Empezando desde cero

Este Epic asume que tu directorio `~/Documents/practicas/chatbot-soporte/` está **vacío** (sin `src/`, sin `package.json`, sin `tsconfig.json` — solo `.git/` y la carpeta `epics/` con esta documentación). Si tienes archivos viejos, bórralos antes de arrancar:

```bash
cd ~/Documents/practicas/chatbot-soporte
ls -la                          # confirmá qué hay
# si solo está .git y epics/, listo. Si hay basura, borrala:
# rm -rf src dist node_modules package.json pnpm-lock.yaml tsconfig.json
```

## Conceptos cubiertos

- **pnpm workspaces**: múltiples packages en un solo repo con deps compartidas y scripts orquestados.
- **Clean Architecture** con 4 capas y guardrails automáticos.
- **Shared types package**: compartir tipos TS entre packages sin duplicar código.
- **TypeScript con `module: preserve` + `moduleResolution: bundler`**: imports sin `.js` (consistente con tu booking).
- **tsup** para production build (consistente con tu booking).
- **Fail-fast config** con zod al boot.
- **Logging estructurado** + correlation ID con AsyncLocalStorage.
- **Express middleware order**: correlation → logger → routes → 404 → error handler.
- **Liveness vs readiness probes**.
- **Graceful shutdown** ante SIGTERM.
- **Docker multi-stage para monorepo**.

## Pre-requisitos

- Node 20+ y pnpm 10+ instalados.
- Docker Desktop corriendo.
- VS Code con extensiones (ESLint, Prettier, Error Lens).
- Cuenta en Google AI Studio con API key (`GEMINI_API_KEY`).

## Tickets

### 00.1 — Monorepo skeleton (estructura + workspace files)

Desde `~/Documents/practicas/chatbot-soporte/` (asumiendo está vacío salvo `.git` y `epics/`):

```bash
# Crea carpetas de los packages
mkdir -p packages/api/src packages/widget packages/shared/src
```

Crea estos 4 archivos a mano (con VS Code o Claude Code CLI):

**`pnpm-workspace.yaml`** (raíz):
```yaml
packages:
  - "packages/*"
```

**`package.json`** (raíz):
```json
{
  "name": "chatbot-soporte",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@10.10.0",
  "scripts": {
    "dev:api": "pnpm --filter @chatbot-soporte/api dev",
    "dev:widget": "pnpm --filter @chatbot-soporte/widget dev",
    "build": "pnpm -r --parallel build",
    "lint:deps": "pnpm --filter @chatbot-soporte/api lint:deps",
    "ingest": "pnpm --filter @chatbot-soporte/api ingest"
  }
}
```

**`.gitignore`** (raíz):
```
# Dependencies
node_modules/
**/node_modules/

# Build outputs
dist/
**/dist/

# Environment
.env
**/.env
!.env.example
!**/.env.example

# OS
.DS_Store

# IDE
.vscode/
.idea/

# Logs
*.log

# Vector DB data (Epic 02)
chroma-data/

# Caddy data (Epic 04)
caddy-data/
caddy-config/
```

**`.env.example`** (raíz):
```
# Required
GEMINI_API_KEY=

# Optional (with defaults)
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
SYSTEM_PROMPT="Eres el bot de soporte de Pizzería La Italiana. Responde con tono amable. Si no sabes algo, di 'no tengo esa información, déjame conectarte con un humano'."
ALLOWED_ORIGINS=*

# Filled in later epics:
# CHROMA_URL=http://localhost:8000     # Epic 02
# SIMILARITY_THRESHOLD=0.3              # Epic 02
# RATE_LIMIT_PER_MIN=10                 # Epic 01
# MAX_HISTORY_MESSAGES=40               # Epic 01
```

**Concepto clave:** `pnpm-workspace.yaml` le dice a pnpm "estos son los packages del monorepo". El `package.json` raíz tiene `"private": true` (los monorepos no se publican como un solo paquete) y scripts top-level que delegan a packages específicos via `--filter`.

**Deep-dive a Claude Code:** _"En la raíz de chatbot-soporte/ crea pnpm-workspace.yaml (declara packages/* como workspaces), package.json raíz (private, scripts orquestados con --filter), .gitignore para monorepo, .env.example con variables required + opcionales documentadas. Crea las carpetas packages/api/src, packages/widget, packages/shared/src."_

### 00.2 — package.json de cada package + install

Crea estos 3 archivos:

**`packages/api/package.json`**:
```json
{
  "name": "@chatbot-soporte/api",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "dist/main.js",
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "tsup",
    "start": "node dist/main.js",
    "lint:deps": "depcruise src --config .dependency-cruiser.cjs"
  },
  "dependencies": {
    "@chatbot-soporte/shared": "workspace:*",
    "@google/genai": "^2.7.0",
    "cors": "^2.8.5",
    "dotenv": "^17.4.2",
    "express": "^5.2.1",
    "pino": "^9.5.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.6",
    "@types/node": "^25.9.1",
    "dependency-cruiser": "^16.0.0",
    "pino-pretty": "^11.3.0",
    "tsup": "^8.3.5",
    "tsx": "^4.22.3",
    "typescript": "^6.0.3"
  }
}
```

**`packages/shared/package.json`**:
```json
{
  "name": "@chatbot-soporte/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

**`packages/widget/package.json`** (placeholder, Vite lo completa en Epic 03):
```json
{
  "name": "@chatbot-soporte/widget",
  "version": "0.0.1",
  "private": true,
  "type": "module"
}
```

Crea también `packages/shared/src/index.ts` con contenido placeholder:
```ts
// Tipos compartidos entre api y widget (DTOs HTTP).
// Se llenan en Epic 01 (ChatRequest) y Epic 02 (referencias a knowledge chunks).
export {};
```

Desde la raíz, instala todo:
```bash
pnpm install
```

Esto descarga las deps externas a un único `node_modules/` global y crea **links simbólicos** entre `packages/api/node_modules/@chatbot-soporte/shared` → `packages/shared`. Verificá con:
```bash
ls -la packages/api/node_modules/@chatbot-soporte/
# Debe mostrar shared como symlink a ../../shared
```

**Concepto clave:** `workspace:*` es la sintaxis de pnpm para "este package vive en este repo, linkéalo directo". Cambios en `shared` los ve `api` al instante. No hay paso de publish — es vivo.

**Las versiones que ves arriba (^2.7.0, ^9.5.0, etc.)** son del momento que escribimos esto. pnpm va a actualizar a las últimas compatibles cuando hagas install. Si algo no compila después, te aviso cómo pin-ear.

**Deep-dive a Claude Code:** _"Crea packages/api/package.json con todas las deps listadas (deps: @chatbot-soporte/shared workspace:*, @google/genai, cors, dotenv, express, pino, zod; devDeps: tipos + tsup + tsx + typescript + dependency-cruiser + pino-pretty). type: module. packages/shared/package.json con main/types apuntando a src/index.ts. packages/widget/package.json placeholder. Crea packages/shared/src/index.ts con export {}. Desde la raíz: pnpm install. Verificá que se creó el symlink en packages/api/node_modules/@chatbot-soporte/shared."_

### 00.3 — TypeScript config (base + per-package) + tsup

Para consistencia con tu booking, usaremos `module: preserve` + `moduleResolution: bundler` (imports sin `.js`). El build de producción lo hace `tsup`.

**`tsconfig.base.json`** (raíz):
```jsonc
{
  // Config base compartida por todos los packages del monorepo.
  // Cada package extiende este y agrega lo específico suyo.
  "compilerOptions": {
    // --- Target y módulos ---
    "target": "esnext",
    "module": "preserve",          // Permite imports sin .js; tsup hace el bundling final.
    "moduleResolution": "bundler",  // Resuelve igual que un bundler (Vite/tsup), no como Node puro.
    "moduleDetection": "force",     // Trata todo .ts como módulo (evita problemas con archivos sin imports).

    // --- Interoperabilidad ---
    "esModuleInterop": true,
    "verbatimModuleSyntax": true,   // Distingue import type vs import — más seguro con ESM.
    "isolatedModules": true,        // Asegura compatibilidad con compiladores que procesan archivos uno a uno (tsup, esbuild).

    // --- Strict máximo ---
    "strict": true,
    "noUncheckedIndexedAccess": true,     // arr[0] es T | undefined; te salva de bugs.
    "exactOptionalPropertyTypes": true,    // { foo?: string } no admite { foo: undefined } explícitamente.
    "noImplicitOverride": true,            // override keyword obligatorio en métodos sobreescritos.
    "noUncheckedSideEffectImports": true,  // Errores explícitos en import "side-effect" sin tipos.

    // --- Higiene de compilación ---
    "skipLibCheck": true,           // No re-chequea .d.ts de libs (compila más rápido).
    "forceConsistentCasingInFileNames": true,
    "sourceMap": true,
    "declaration": false,           // No emitimos .d.ts en api/shared (tsup decide).

    // --- Tipos globales ---
    "types": ["node"]
  }
}
```

**`packages/api/tsconfig.json`**:
```jsonc
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

**`packages/shared/tsconfig.json`**:
```jsonc
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
```

(El widget tendrá su propio tsconfig generado por Vite en Epic 03.)

**`packages/api/tsup.config.ts`** (build de producción):
```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/main.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,       // Borra dist/ antes de cada build (asegura output fresco).
  sourcemap: true,
  dts: false,        // No generamos declaration files (no se publica este package).
  splitting: false,  // Una sola salida JS, no chunks.
});
```

Verifica que TypeScript reconoce todo:
```bash
cd packages/api
pnpm exec tsc --noEmit   # No genera archivos, solo verifica tipos. Debe pasar sin errores.
```

(Va a fallar si no creaste `src/main.ts` aún — está bien, lo creamos en tickets siguientes. Por ahora crea un placeholder: `echo "export {};" > src/main.ts`.)

**Concepto clave:** `tsx` corre TS en dev rápido (no compila a disco). `tsup` compila a `dist/` con bundling optimizado para prod. Editor + dev + build usan la **misma config** (los strict flags se respetan en los 3).

**Deep-dive a Claude Code:** _"Crea tsconfig.base.json en raíz con la config compartida (target esnext, module preserve, moduleResolution bundler, strict completo, noUncheckedIndexedAccess, exactOptionalPropertyTypes, noImplicitOverride, verbatimModuleSyntax, isolatedModules, moduleDetection force). Crea packages/api/tsconfig.json y packages/shared/tsconfig.json que la extienden. Crea packages/api/tsup.config.ts (entry src/main.ts, format esm, target node20, clean true, sourcemap). Crea placeholder src/main.ts con export {}. Verifica con pnpm exec tsc --noEmit que no hay errores."_

### 00.4 — Clean Architecture skeleton + dependency-cruiser

Crea la estructura en `packages/api/src/`:

```
src/
├── domain/           ← entidades y reglas (NO importa de nadie)
├── application/      ← casos de uso (importa solo de domain)
├── infrastructure/   ← adapters: DB, LLM, logger (importa de domain + application)
├── interfaces/       ← entry points: HTTP (importa de todas)
└── main.ts           ← composition root
```

Cada carpeta arranca con un `index.ts` que tiene un comentario placeholder explicando el rol de la capa.

Configura `dependency-cruiser` en `packages/api/.dependency-cruiser.cjs` para enforzar:
- `domain/` no importa de nadie de las otras 3 capas.
- `application/` solo importa de `domain/`.
- `infrastructure/` importa de `domain/` y `application/`.
- `interfaces/` puede importar de todas.

El script `lint:deps` ya está declarado en `packages/api/package.json`. Desde la raíz: `pnpm lint:deps`.

**Concepto clave:** la regla automática es lo que separa una arquitectura "aspiracional" de una "vivida". Si la rompes, falla el lint y por consecuencia el CI.

**Deep-dive a Claude Code:** _"Configura dependency-cruiser en packages/api/.dependency-cruiser.cjs con las reglas de Clean Architecture (domain no importa nada, application solo domain, infrastructure de ambas, interfaces de todas). Comenta cada regla con qué previene. Crea las 4 carpetas en packages/api/src/ con un index.ts placeholder que comenta el rol de la capa."_

### 00.5 — Config tipada con Zod (fail-fast)

Crea `packages/api/src/infrastructure/config/env.ts` que:

1. Lee `process.env`.
2. Valida con schema zod.
3. Crashea con mensaje claro al boot si falla.
4. Exporta objeto `env` tipado.

Variables del schema:
- `NODE_ENV: 'development' | 'test' | 'production'` (default `development`)
- `PORT: number` (default 3000)
- `GEMINI_API_KEY: string` (required, min length 10)
- `LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error'` (default `info`)
- `SYSTEM_PROMPT: string` (default razonable)
- `ALLOWED_ORIGINS: string` (default `*`)

**Concepto clave:** "fail-fast en boot". Mejor que crashee al arrancar con `Missing GEMINI_API_KEY` que descubrirlo a las 3 horas en runtime. El resto del código accede a `env.geminiApiKey` (tipado), no a `process.env.GEMINI_API_KEY!`.

**Deep-dive a Claude Code:** _"Crea packages/api/src/infrastructure/config/env.ts que valide con zod NODE_ENV, PORT, GEMINI_API_KEY (required, min 10), LOG_LEVEL, SYSTEM_PROMPT, ALLOWED_ORIGINS. Crashea con mensaje listando qué falta o qué tiene formato inválido. Exporta env tipado. Documenta el patrón fail-fast con un comentario al inicio."_

### 00.6 — Logger estructurado con Pino + correlation ID

Crea `packages/api/src/infrastructure/logger/`:

- `pino.ts` — instancia de Pino. JSON en prod, pino-pretty en dev. Nivel desde `env.logLevel`.
- `correlation-context.ts` — `AsyncLocalStorage<{ correlationId: string }>`.
- `correlation-middleware.ts` — Express middleware que lee `X-Correlation-Id` o genera con `crypto.randomUUID()`, lo guarda en ALS, lo agrega al response header.
- `get-logger.ts` — helper que devuelve logger child con `correlationId` desde el ALS.

**Concepto clave:** AsyncLocalStorage te permite propagar el correlation ID sin pasarlo por parámetro a cada función. Cualquier log en cualquier capa accede al ID activo del request actual.

**Deep-dive a Claude Code:** _"Configura Pino en packages/api/src/infrastructure/logger/ con AsyncLocalStorage para correlation ID. Output JSON en prod, pino-pretty en dev. Implementa middleware Express que lee/genera correlation ID, lo guarda en ALS, lo agrega al response header X-Correlation-Id. Helper getLogger() que devuelve child con correlationId desde el ALS."_

### 00.7 — Express skeleton + error handler central

Crea `packages/api/src/interfaces/http/`:

- `app.ts` — configura Express. Define orden de middlewares.
- `middleware/error-handler.ts` — handler central.
- `middleware/not-found.ts` — handler 404.
- `errors/domain-error.ts` (en `packages/api/src/domain/errors/`) — clase base `DomainError` con `code`, `message`, `httpStatus`.

`packages/api/src/main.ts` — composition root: lee env, instancia logger, arma la app, levanta el server con `http.createServer(app)`.

Orden de middleware:
```
1. cors (configurable por env.allowedOrigins)
2. json body parser
3. correlation-id middleware
4. request logger
5. routes (vacío por ahora)
6. not-found handler
7. error handler central
```

Error handler distingue:
- `DomainError` → status + JSON `{ code, message }`
- `ZodError` → 400 + detalle
- Otros → 500 genérico (NO filtrar stack al cliente; sí loggearlo).

**Deep-dive a Claude Code:** _"Levanta Express skeleton en packages/api/src/interfaces/http/. Middlewares en orden estricto. Error handler que distingue DomainError, ZodError, errores no esperados (sin filtrar stack al cliente). DomainError base class en packages/api/src/domain/errors/. packages/api/src/main.ts como composition root: lee env, arma logger, instancia app, http.createServer."_

### 00.8 — Healthcheck `/health/live` y `/health/ready`

Dos endpoints en `packages/api/src/interfaces/http/routes/health.ts`:

- `GET /health/live` — siempre 200.
- `GET /health/ready` — también 200 por ahora con `TODO(epic-02)` indicando que se extiende para chequear Chroma.

**Concepto clave:**
- **Liveness** = proceso vivo. Si falla → orquestador MATA y reinicia.
- **Readiness** = listo para tráfico. Si falla → load balancer DEJA DE MANDAR requests, no reinicia.

Confundirlos causa restart loops innecesarios.

**Deep-dive a Claude Code:** _"Implementa GET /health/live y GET /health/ready en packages/api/src/interfaces/http/routes/health.ts. Live siempre 200. Ready trivial por ahora con TODO(epic-02). Documenta diferencia liveness/readiness al inicio del archivo."_

### 00.9 — Graceful shutdown

En `packages/api/src/main.ts`, listen `SIGTERM` y `SIGINT`. Al recibir:

1. Loggea "shutting down".
2. Marca flag `isShuttingDown = true` que `/health/ready` lee → devuelve 503 (load balancer deja de mandar tráfico ANTES de cerrar conexiones).
3. `server.close()`.
4. Espera in-flight requests con timeout 30s.
5. Cierra conexiones externas (en Epic 02 incluye Chroma).
6. `process.exit(0)`. Si timeout vence: `process.exit(1)`.

**Deep-dive a Claude Code:** _"Implementa graceful shutdown en packages/api/src/main.ts. Listen SIGTERM y SIGINT. Marca isShuttingDown (exportable, /health/ready lo lee), server.close(), espera in-flight con timeout 30s, cierra conexiones, exit. Loggea cada paso."_

### 00.10 — Dockerfile multi-stage + docker-compose

`packages/api/Dockerfile`:

```dockerfile
# Stage 1: builder
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable

# Workspace declarations primero (mejor cache de Docker layers)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

RUN pnpm install --frozen-lockfile

# Source code
COPY packages/shared ./packages/shared
COPY packages/api ./packages/api
COPY tsconfig.base.json ./

# Build con tsup
RUN pnpm --filter @chatbot-soporte/api build

# Stage 2: runtime
FROM node:20-alpine
WORKDIR /app
RUN corepack enable

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY packages/shared/src ./packages/shared/src

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health/live || exit 1

CMD ["node", "packages/api/dist/main.js"]
```

`docker-compose.yml` (raíz):
```yaml
services:
  api:
    build:
      context: .
      dockerfile: packages/api/Dockerfile
    ports: ["3000:3000"]
    env_file: .env
    restart: unless-stopped
  # chroma se agrega en Epic 02
  # caddy se agrega en Epic 04
```

**Concepto clave:** el Dockerfile vive en `packages/api/` pero el `build context` es la raíz (necesita acceder a `pnpm-workspace.yaml` y `packages/shared/`). Es el patrón estándar para monorepos pnpm.

**Deep-dive a Claude Code:** _"Crea packages/api/Dockerfile multi-stage para monorepo pnpm. Builder: copia workspace files + ambos package.json's primero (para cache), pnpm install --frozen-lockfile, copia source + tsconfig.base.json, builds con pnpm --filter api build (que invoca tsup). Runtime: copia solo declarations y prod deps, copia dist compilado, copia source TS de shared. User node, HEALTHCHECK a /health/live. docker-compose.yml en raíz con build context=. y dockerfile=packages/api/Dockerfile."_

## Definition of Done

- [ ] `pnpm install` desde la raíz instala todos los packages con links simbólicos
- [ ] `pnpm dev:api` corre el server en localhost:3000
- [ ] `pnpm build` compila todos los packages sin errores (tsup en api)
- [ ] `pnpm lint:deps` pasa (Clean Arch enforced)
- [ ] `docker compose up` levanta el api y responde en localhost:3000
- [ ] `curl localhost:3000/health/live` → 200
- [ ] `curl localhost:3000/health/ready` → 200
- [ ] Cada request genera correlation ID que aparece en logs Y response header
- [ ] Import de `infrastructure/` en `domain/` → lint falla
- [ ] Arranque sin `GEMINI_API_KEY` → crashea al boot con mensaje claro
- [ ] SIGTERM apaga limpio (no mata requests en vuelo)
- [ ] Estructura monorepo correcta: `packages/api`, `packages/widget` (vacío), `packages/shared` con un placeholder
- [ ] Commits por ticket con scope (`feat(api): ...`, `chore(root): ...`)

## Lo que aprendiste

- **pnpm workspaces** y orquestación de packages.
- **TypeScript con bundler resolution** + `tsup` para build (la combinación que ya usabas en booking).
- **Shared types entre packages** sin duplicar código.
- Patrones de **production hygiene** universales.
- **Clean Architecture vivida**, no académica.
- **AsyncLocalStorage** para propagación de contexto.
- **Liveness vs readiness** probes.
- **Multi-stage Docker para monorepo**.

## Trampas comunes

- Olvidar `workspace:*` en deps internas → pnpm trata el package como externo y falla.
- Build context del Dockerfile mal configurado → no encuentra `pnpm-workspace.yaml`.
- Olvidar `corepack enable` en el Dockerfile → pnpm no disponible.
- Liveness probe que pega a la DB → si la DB se cae, mata tu proceso. Eso es responsabilidad de readiness.
- Hardcodear puerto o host → falla en docker/prod.
- Mezclar `module: NodeNext` con `moduleResolution: bundler` → conflicto. Usá `module: preserve` con bundler.
- Compilar shared con tsc cuando exportamos source TS → overhead innecesario por ahora.
