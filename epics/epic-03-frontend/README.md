# Epic 03 — Widget React + assistant-ui + iframe

**Estimación:** 3-4 días.

## Goal

Crear un widget de chat profesional usando **React + Vite + assistant-ui** que se embebe en cualquier sitio web vía **iframe**. El cliente pega un `<script>` vanilla de ~2kb que inyecta el iframe; el iframe carga toda la mini-app React desde TU servidor.

Al final tienes:
- Un widget polished usando primitivos de assistant-ui (Thread, Composer, Message).
- Custom Runtime que conecta al backend que construiste en Epic 01-02.
- **Aislamiento total** CSS/JS del sitio host (gracias al iframe).
- Comunicación host ↔ widget vía postMessage.

**¿Por qué React + iframe y no vanilla JS?** Trade-off explícito:
- assistant-ui ahorra ~2 días de desarrollo de UI (streaming, markdown, scroll, responsive — todo resuelto).
- iframe garantiza cero conflictos con el sitio del cliente (es lo que usan Intercom, Crisp, Drift).
- Bundle size extra (~150kb) es insignificante en sitios de pymes que ya cargan MB de JS.
- Resultado se ve nivel agency, no nivel "primer freelancer".

## Conceptos cubiertos

- **React + Vite + Tailwind**: stack moderno para apps frontend.
- **assistant-ui primitives**: Thread, Composer, Message — UI lista para customizar.
- **Custom Runtime** de assistant-ui: cómo conectar tu propio backend.
- **Streaming response** consumido desde el frontend (fetch + getReader).
- **iframe embedding**: patrón estándar de la industria.
- **postMessage API** para comunicación cross-origin.
- **Vite build**: SPA bundleada lista para deploy.

## Pre-requisitos

- Epic 02 completa (POST /api/chat funcionando con RAG).

## Tickets

### 03.1 — Scaffold widget con Vite + React + TS

Desde la raíz del repo:

```bash
cd packages/widget
pnpm create vite . --template react-ts
# Si pregunta si overwritear (porque el placeholder package.json existe), responde Yes
```

Después actualiza `packages/widget/package.json` para que use el naming del monorepo:

```json
{
  "name": "@chatbot-soporte/widget",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@chatbot-soporte/shared": "workspace:*",
    "react": "^...",
    "react-dom": "^..."
  }
}
```

Desde la raíz: `pnpm install` para que pnpm enlace `@chatbot-soporte/shared` correctamente.

Verifica: `pnpm --filter widget dev` levanta Vite en localhost:5173 mostrando el template de Vite.

**Concepto clave:** Vite es el bundler moderno (reemplazo de Webpack/CRA). Dev usa ESM nativo (rapidísimo, sin bundling). Build usa Rollup (output optimizado).

**Deep-dive a Claude Code:** _"En packages/widget: scaffold Vite + React + TS. Actualiza package.json al naming del monorepo (@chatbot-soporte/widget) con scripts dev/build/preview y dependency a @chatbot-soporte/shared workspace:*. Verifica pnpm --filter widget dev levanta el template."_

### 03.2 — Setup Tailwind CSS

```bash
pnpm --filter widget add -D tailwindcss postcss autoprefixer
cd packages/widget
pnpm exec tailwindcss init -p
```

Configura `tailwind.config.js` (content paths a `src/**/*.{ts,tsx,html}`) y `src/index.css` con las directivas:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Verifica con una clase Tailwind básica (`bg-blue-500`, `text-white`) en `App.tsx` que se ve aplicada.

**Concepto clave:** assistant-ui está diseñado para integrar con Tailwind (sigue el patrón de shadcn/ui — primitivos sin estilo, tú los pintas con Tailwind).

### 03.3 — Install assistant-ui + Thread básico

```bash
pnpm --filter widget add @assistant-ui/react
```

Reemplaza `src/App.tsx`:

```tsx
import { AssistantRuntimeProvider, Thread } from "@assistant-ui/react";
import { useLocalRuntime } from "@assistant-ui/react";
import { createCustomRuntime } from "./runtime/custom-runtime";

export default function App() {
  const runtime = useLocalRuntime(createCustomRuntime());

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
```

El `createCustomRuntime` lo escribimos en el siguiente ticket; por ahora puede ser un stub que devuelva mensajes hardcoded para verificar que assistant-ui se ve.

**Concepto clave:** assistant-ui tiene dos partes:
1. **Runtime**: lógica de "cómo hablar con el LLM" — tú la implementas.
2. **Componentes** (Thread, Composer, Message): UI lista, vienen estilizadas por defecto pero customizables.

**Deep-dive a Claude Code:** _"Instala @assistant-ui/react en packages/widget. Reemplaza App.tsx con AssistantRuntimeProvider que usa useLocalRuntime + un createCustomRuntime stub (devuelve mensajes hardcoded para visualizar). Renderiza <Thread />. Verifica que se ve el chat con el stub."_

### 03.4 — Custom Runtime que llama a /api/chat

Crea `packages/widget/src/runtime/custom-runtime.ts`. Implementa un `ChatModelAdapter` (la interface que assistant-ui espera):

- Recibe `messages` + `abortSignal`.
- Genera o recupera `sessionId` de `localStorage` con namespace `chatbot-session-id`.
- Hace `fetch(${VITE_API_URL}/api/chat, { ... })` con body `{ sessionId, message: lastMessage.content }`.
- Lee response streaming con `response.body.getReader()` + `TextDecoder`.
- Yields chunks al runtime.

Configurable vía `import.meta.env.VITE_API_URL` (apunta al backend; en dev local: `http://localhost:3000`).

Importa el tipo `ChatRequest` desde `@chatbot-soporte/shared` para tipar el body. **Si en Epic 01 el contrato cambia, este código se rompe en compile-time** — la magia del shared package.

**Concepto clave:** el Custom Runtime es el adapter entre assistant-ui (que sabe de UI) y tu API (que sabe de RAG + LLM). assistant-ui no asume nada sobre tu backend — tú escribís el adapter.

**Deep-dive a Claude Code:** _"Crea packages/widget/src/runtime/custom-runtime.ts con createCustomRuntime() que devuelve un ChatModelAdapter de assistant-ui. Genera/recupera sessionId de localStorage con namespace 'chatbot-session-id'. Importa ChatRequest de @chatbot-soporte/shared para tipar el body. fetch a {VITE_API_URL}/api/chat con method POST. Lee streaming con response.body.getReader() + TextDecoder. Yields chunks. Maneja abortSignal."_

### 03.5 — Estilizar y customizar el widget

Personaliza el Thread:
- Layout flotante full-height (toda la mini-app ES el chat — el botón flotante vive afuera en el embed.js).
- Header con nombre del bot (configurable vía `VITE_BOT_NAME`, default "Asistente").
- Burbujas user/assistant diferenciadas por color y alineación.
- Input fixed al fondo.
- Mobile responsive (Tailwind responsive classes).
- Color principal configurable vía `VITE_PRIMARY_COLOR` (default un azul agradable).

**Deep-dive a Claude Code:** _"Estiliza el Thread de assistant-ui en packages/widget/src/App.tsx con Tailwind. Layout flex-col full-height. Header con VITE_BOT_NAME. Burbujas user (alineado derecha, color principal) y assistant (alineado izquierda, gris claro). Input fixed al fondo. Mobile-first. Color principal vía VITE_PRIMARY_COLOR."_

### 03.6 — Build pipeline: output a packages/api/public/widget/

Configura `packages/widget/vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  base: '/widget/',                    // assets se cargan desde /widget/*
  build: {
    outDir: path.resolve(__dirname, '../api/public/widget'),
    emptyOutDir: true,
    sourcemap: true,
  }
});
```

Build: `pnpm --filter widget build` → archivos compilados van directo a `packages/api/public/widget/`.

En `packages/api/src/interfaces/http/app.ts`, agrega:
```ts
import path from 'node:path';
app.use('/widget', express.static(path.resolve(__dirname, '../../public/widget')));
```

Visitando `http://localhost:3000/widget/` debes ver el widget standalone funcionando.

**Concepto clave:** en dev local Express sirve los estáticos. En producción Caddy los sirve directamente (más rápido) — eso es Epic 04.

**Deep-dive a Claude Code:** _"Configura vite.config.ts en packages/widget: outDir absoluto a ../api/public/widget, base /widget/, sourcemaps. Agrega express.static en packages/api/src/interfaces/http/app.ts para servir /widget desde packages/api/public/widget. Verifica que pnpm --filter widget build genera archivos ahí y que http://localhost:3000/widget/ los sirve."_

### 03.7 — Loader script vanilla (embed.js)

Crea `packages/widget/public/embed.js` — script **vanilla JS puro** (no React, no TS — solo JS plano) que el cliente pega en su sitio. Hace:

1. Lee `data-api-url` del propio `<script>` tag.
2. Crea botón flotante (icono 💬) en `position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;`.
3. Al click: crea un `<iframe src="${dataApiUrl}/widget/">` posicionado responsive:
   - Mobile (< 768px): fullscreen.
   - Desktop: ventana 400×600 px en esquina inferior derecha.
4. Re-click en el botón: cierra el iframe (lo oculta o lo remueve).
5. Listen `message` events del iframe para `chatbot:ready` (mostrar el botón solo cuando el widget cargó) y `chatbot:unread` (badge en el botón).

Este archivo NO se procesa por Vite — Vite lo copia tal cual desde `packages/widget/public/`.

Snippet final que el cliente pega:
```html
<script src="https://tu-api.com/widget/embed.js" data-api-url="https://tu-api.com" async></script>
```

**Concepto clave:** este es el patrón estándar de la industria (Intercom, Crisp, Drift). El loader vanilla es minimal (~2kb), el iframe es donde vive toda la complejidad. Cero conflictos con el host porque están en frames separados.

**Deep-dive a Claude Code:** _"Crea packages/widget/public/embed.js como JS vanilla puro (no transpilable). Lee data-api-url del script tag. Crea botón flotante con icono 💬 (posición fixed bottom-right, z-index máximo). Click → crea iframe a {dataApiUrl}/widget/ posicionado responsive (fullscreen mobile, 400x600 desktop). Re-click → cierra. Listen message events del iframe (chatbot:ready, chatbot:unread). Verifica que Vite copia el archivo tal cual desde public/ (no lo transforma)."_

### 03.8 — postMessage protocol

En el widget (`packages/widget/src/`), emite eventos:
- `{ type: 'chatbot:ready' }` cuando el widget cargó (en `useEffect` de App).
- `{ type: 'chatbot:unread', count: number }` cuando llega un mensaje nuevo (futuro — no obligatorio en MVP).

En el loader (`embed.js`), escucha:
```js
window.addEventListener('message', (event) => {
  // SIEMPRE valida origin
  if (event.origin !== EXPECTED_ORIGIN) return;
  switch (event.data?.type) {
    case 'chatbot:ready': /* mostrar botón */ break;
    case 'chatbot:unread': /* badge en botón */ break;
  }
});
```

**Concepto clave:** postMessage es el único modo seguro de comunicación cross-origin entre frames. Validar `event.origin` es **obligatorio** — sin esto, cualquier sitio puede manipular tu widget.

**Deep-dive a Claude Code:** _"Implementa postMessage protocol. En widget App.tsx: en useEffect emite chatbot:ready cuando monta. En embed.js: escucha message events con validación estricta de event.origin contra el dataApiUrl, maneja chatbot:ready (mostrar botón) y chatbot:unread (badge)."_

### 03.9 — Página de demo

Crea `packages/widget/public/demo.html` — página fake de pizzería con el snippet de embed pegado al final del `<body>`:

```html
<!DOCTYPE html>
<html>
<head><title>Pizzería La Italiana</title></head>
<body>
  <h1>Pizzería La Italiana</h1>
  <p>Lorem ipsum sobre la pizzería...</p>
  <!-- snippet de embed: -->
  <script src="/widget/embed.js" data-api-url="" async></script>
</body>
</html>
```

(En dev, `data-api-url=""` significa "mismo origen". En prod del demo, apuntás al dominio real.)

Vite copia este archivo tal cual desde `public/`. En `app.ts` del api agregá:
```ts
app.use('/demo', express.static(path.resolve(__dirname, '../../public/widget')));
```

(Mismo directorio, pero servido en `/demo/`. O hacé una carpeta `public/demo/` aparte si preferís.)

### 03.10 — Documentar canales adicionales

Crea `docs/channels.md` con sección por canal explicando integración y precio:

- **WhatsApp Business API** (Twilio o 360dialog) — costo + setup time + complexity.
- **Telegram** — gratis con bot tokens, más fácil.
- **Facebook Messenger** — Meta Graph API, requiere review.
- **Instagram DMs** — subset de Meta.

Cada canal es un gig adicional ("integro tu chatbot a WhatsApp por +$X").

## Definition of Done

- [ ] `pnpm --filter widget dev` levanta Vite con el widget funcional
- [ ] `pnpm --filter widget build` genera bundle en `packages/api/public/widget/`
- [ ] `http://localhost:3000/widget/` carga el widget standalone
- [ ] `http://localhost:3000/demo/demo.html` muestra el sitio fake con el widget embebido funcionando end-to-end
- [ ] Chat end-to-end: mandas mensaje → llega al API → RAG → LLM → streaming visible
- [ ] postMessage `chatbot:ready` funciona
- [ ] Responsive: mobile fullscreen, desktop ventana
- [ ] Commits por ticket con scope `feat(widget): ...`

## Lo que aprendiste

- React + Vite + TS stack moderno.
- assistant-ui: cómo usar primitivos de chat sin reinventar UI.
- Custom Runtime adapter pattern.
- iframe embedding pattern (industry standard).
- postMessage cross-origin communication.
- Shared types entre packages funcionando en tiempo real.

## Trampas comunes

- Olvidar `base: '/widget/'` en Vite config → assets se cargan desde `/` y rompen.
- Hardcodear URL del API en lugar de leerla de env → no se puede reusar.
- No validar `event.origin` en postMessage → security hole.
- z-index del botón muy bajo → tema del cliente lo tapa. Usa `2147483647` (max int).
- iframe sin permissions correctas (`allow="microphone; clipboard-write"`) → bloquea features.
- localStorage sessionId sin namespace → choca con otros widgets del cliente.
- Tipos del API importados directo desde `@chatbot-soporte/api` (no de `shared`) → invierte la dirección de dependencia.
