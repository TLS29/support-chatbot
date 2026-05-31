# Epic 03 — Frontend widget embebible

**Estimación:** 3-4 días.

## Goal

Crear una interfaz web de chat que tus clientes potenciales puedan ver funcionando, y que (en su versión MVP) sea embebible en cualquier sitio web mediante un snippet de HTML/JS.

## Conceptos cubiertos

- API HTTP del backend (exponer el caso de uso como endpoint Express).
- Streaming desde backend (Server-Sent Events o text streaming con fetch).
- UI básica de chat (input, lista de mensajes, scroll automático).
- CORS — por qué importa cuando frontend y backend están en dominios distintos.
- Manejo de sesiones por sessionId.

## Pre-requisitos

- Epic 02 completa (el chatbot ya funciona desde CLI con RAG).

## Tickets

### 03.1 — Decidir tipo de frontend

Tres opciones:

1. **HTML + JS vanilla** — más simple, perfecto para "embebible" (un snippet `<script>` que cualquiera pega en su web).
2. **Next.js** — más completo, te da SSR, routing, deploy fácil en Vercel. Buena demo de portfolio.
3. **React + Vite** — middle ground, sin el peso de Next.

**Recomendación:** empezá con HTML + JS vanilla para el widget embebible (es lo más vendible — los clientes quieren un snippet que pegan y listo). Si después querés, montá un Next.js encima como "landing page" del demo público.

Documenta tu decisión en un comentario al inicio del archivo principal o en el README del proyecto.

### 03.2 — Exponer el chatbot como API HTTP

En `src/interfaces/http/`, monta un servidor Express:

```
pnpm add express cors
pnpm add -D @types/express @types/cors
```

Endpoint:

```
POST /api/chat
Body: { message: string, sessionId: string }
Response: text stream (chunks de la respuesta del LLM)
```

El handler:

1. Recibe `{ message, sessionId }`.
2. Recupera/crea el historial de la sesión.
3. Invoca `SendMessageUseCase` con el mensaje y el historial.
4. Stream-ea la respuesta como text chunks al cliente.
5. Guarda la respuesta completa en el historial de la sesión.

**Concepto clave:** ahora tienes dos interfaces apuntando al mismo caso de uso: CLI (Epic 01-02) y HTTP (Epic 03). Esto es exactamente para lo que sirve Clean Architecture — el caso de uso no cambia, solo agregamos un adapter más en `interfaces/`.

**Deep-dive a Claude Code:** _"Monta un servidor Express en interfaces/http/. Endpoint POST /api/chat que recibe { message, sessionId } y stream-ea la respuesta del SendMessageUseCase. Configura CORS para permitir todos los orígenes (luego en Epic 04 restringimos). Maneja errores devolviendo 500 con JSON { error: '...' }."_

### 03.3 — Manejo de sesiones en memoria

El backend debe mantener el historial de cada sesión en memoria por ahora. Un `Map<sessionId, Message[]>` es suficiente para el MVP.

**Concepto clave:** la `sessionId` la genera el frontend al cargar (un UUID guardado en localStorage o cookie) y se manda con cada request. El backend la usa para recuperar el historial. Sin esto, cada request al endpoint sería un mensaje aislado.

**Nota sobre producción:** un `Map` en memoria pierde todo cuando reinicia el servidor, y no escala más allá de una instancia. En producción esto sería Redis o una DB. Para el demo está bien.

### 03.4 — UI básica del widget

Crea una carpeta `frontend/` (o `public/`) con un `widget.html` mínimo:

```html
<div id="chatbot-root">
  <div id="chatbot-messages"></div>
  <input id="chatbot-input" placeholder="Escribe tu mensaje..." />
</div>
<script src="/widget.js"></script>
```

`widget.js` hace:

- Genera o recupera `sessionId` de localStorage.
- Maneja el input (Enter para enviar).
- Hace `fetch('/api/chat', { ... })` con streaming.
- Va appendeando los chunks al div de mensajes a medida que llegan.
- Auto-scroll hacia abajo cuando llegan mensajes nuevos.

**Concepto clave:** `fetch` soporta streaming nativamente leyendo `response.body.getReader()`. No necesitas SSE explícito para esto.

**Deep-dive a Claude Code:** _"Crea frontend/widget.html y frontend/widget.js. UI mínima: lista de mensajes y un input. Conecta al endpoint /api/chat con fetch streaming usando response.body.getReader(). Auto-scroll. Distingue visualmente mensajes del usuario y del bot. CSS inline básico por ahora."_

### 03.5 — Estilos básicos

Hazlo presentable. CSS inline o en `widget.css` aparte. Inspiración: el chat de Intercom, Crisp, o cualquier widget de soporte. Mínimo:

- Burbujas de chat diferenciadas por color (usuario vs bot).
- Avatar/icono del bot.
- Indicador de "escribiendo..." durante el stream.
- Botón flotante en esquina inferior derecha (estilo widget clásico) que abre/cierra el chat.

No tiene que ser hermoso. Tiene que verse profesional. Un cliente potencial no debe pensar "esto se ve a hecho a las prisas".

### 03.6 — Snippet de embed

Genera un snippet que un cliente potencial pueda pegar en su web:

```html
<script src="https://tu-dominio.com/widget.js" data-bot-id="abc123" async></script>
```

El script al cargar:

1. Crea el div del widget en el DOM dinámicamente (no asume nada en el HTML del cliente).
2. Conecta al backend usando el `data-bot-id` para identificar al cliente (en esta épica con un solo bot está bien; multi-tenant es para después).

**Concepto clave:** **este snippet ES tu producto en Fiverr.** Cuando un cliente compra, le entregas un snippet personalizado para su negocio. Tiene que ser de una sola línea, copy-paste, y funcionar inmediatamente.

Crea también un `frontend/demo.html` que sea una página de prueba con el snippet pegado, para que puedas verificar el embed funcionando aislado del backend.

**Deep-dive a Claude Code:** _"Refactoriza widget.js para que al cargar inserte su propio DOM en la página (no asume que existen los divs). Crea frontend/demo.html que sea una página fake de un negocio con el snippet de embed pegado. Verifica que funciona aún si la página no tiene relación con el backend."_

## Definition of Done

- [ ] Backend Express corre con `pnpm dev:api`
- [ ] Endpoint POST /api/chat funciona con curl/Postman (streamea respuestas)
- [ ] Widget HTML/JS conecta al backend y muestra respuestas en streaming
- [ ] El widget es navegable: puedes mandar varios mensajes, recordar el historial dentro de la sesión
- [ ] Estilos básicos aplicados (presentable, no necesita ser premiado)
- [ ] Snippet de embed funciona en un HTML de prueba separado (`demo.html`)
- [ ] Commits por ticket

## Lo que aprendiste

- Cómo exponer un caso de uso como HTTP API en Express.
- Streaming response en el backend y consumo de streaming en el frontend (`fetch` + `getReader()`).
- Manejo de sesiones por sessionId.
- Embedding de widgets en sitios externos (CORS, script tag pattern).

## Trampas comunes

- CORS mal configurado — vas a perder el primer día sin querer (el browser bloquea el fetch silenciosamente y solo se ve en consola).
- Storage del historial en memoria sin límite — un sessionId activo puede crecer indefinidamente. Cap a N mensajes (los últimos 20) o limpia sesiones inactivas.
- No manejar el stream del lado del frontend correctamente → se ve la respuesta solo cuando termina. Asegúrate de hacer `decoder.decode(value)` por chunk y appendear al DOM en cada iteración.
- Usar `localhost` hardcodeado en el `fetch` → en producción no funciona. Lee la URL del backend de una constante configurable.
- Olvidar `Content-Type: text/event-stream` o `text/plain` en el response del backend → algunos browsers buffer-ean toda la respuesta antes de pasarla al JS.
