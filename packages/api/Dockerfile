# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────
# Stage 1: builder — instala TODO y compila con tsup
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable

# Declaraciones del workspace primero → mejor cache de capas Docker:
# si no cambian package.json/lockfile, Docker reusa el layer de install.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

RUN pnpm install --frozen-lockfile

# Código fuente + config base de TS
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/api ./packages/api

# Build de producción (tsup → packages/api/dist)
RUN pnpm --filter @support-chatbot/api build

# ─────────────────────────────────────────────────────────────
# Stage 2: runtime — solo deps de prod + el dist compilado
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
RUN corepack enable

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/

# --prod: NO instala devDependencies (tsup, tsx, pino-pretty, etc.)
RUN pnpm install --frozen-lockfile --prod

# El bundle compilado y el source TS de shared (su main apunta a src/)
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY packages/shared/src ./packages/shared/src

# Corre como usuario sin privilegios (seguridad)
USER node
EXPOSE 3000

# Liveness desde el propio contenedor (busybox wget viene en alpine)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health/live || exit 1

CMD ["node", "packages/api/dist/main.js"]
