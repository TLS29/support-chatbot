# Epic 04 — Deploy + demo público

**Estimación:** 2-3 días.

## Goal

Tener un demo público accesible por URL, con buen README de portafolio, listo para mostrar en Fiverr.

Al terminar esta épica tienes un producto vendible: una URL que un cliente potencial puede abrir y ver el bot funcionando, y un README que vende.

## Conceptos cubiertos

- Hosting de backend Node.js (Railway / Render / Fly.io vs Vercel serverless).
- Hosting de frontend estático (Vercel / Netlify / Cloudflare Pages).
- Variables de entorno en producción.
- Domain + HTTPS.
- Demo data y storytelling: cómo presentar un proyecto técnico para audiencia no-técnica.

## Pre-requisitos

- Epic 03 completa.
- Cuenta en alguna plataforma de hosting (Railway, Render, Fly.io).
- Cuenta de Vercel (para frontend).

## Tickets

### 04.1 — Decidir plataforma de hosting

Trade-offs:

- **Railway / Render** — buenos para servidores Node persistentes. Necesitamos esto porque mantenemos sesiones en memoria + Chroma corriendo. Free tier limitado pero suficiente para demo.
- **Vercel** — buenísimo para frontend estático. Sus serverless functions tienen timeout de 10s en free tier — mata el streaming largo, no las uses para el backend del chatbot.
- **Fly.io** — más control, Docker nativo, free tier decente.

**Recomendación:** Render para el backend (free tier suficiente para demo), Vercel para el frontend estático.

**Sobre Chroma:** necesita correr en algún lado. Opciones:

- Chroma Cloud (managed, free tier limitado a 1GB).
- Levantar Chroma como segundo servicio en Render (con Docker).
- Cambiar a Pinecone (free tier: 1 índice, 100k vectores).

**Recomendación:** Pinecone para el demo público (más simple de operar y free tier suficiente). Si querés mantener Chroma, usá Chroma Cloud.

Documenta tu decisión.

### 04.2 — Preparar el backend para producción

Antes de deployar, asegúrate de que:

- **Variables de entorno**: todas las keys leen de `process.env`, nada hardcoded.
- **Validación al boot**: si falta `GEMINI_API_KEY`, crashea con mensaje claro. No te quedés con un error misterioso a las 3 horas.
- **CORS restringido**: solo permite el dominio del frontend en producción. En desarrollo seguís con `*`.
- **Logging básico**: imprime cada request (método, path, status) y errores con stack.
- **Healthcheck**: endpoint `GET /health` que devuelve 200.

**Deep-dive a Claude Code:** _"Prepara el backend para producción: validación de env al boot con zod o checks manuales que crasheen si falta GEMINI_API_KEY o PINECONE_API_KEY (o las que uses), CORS restringido vía variable de entorno FRONTEND_URL, logging básico con console.log estructurado (incluyendo timestamps), endpoint GET /health que devuelve 200 OK."_

### 04.3 — Deploy del backend

Sigue los docs de la plataforma elegida. Pasos generales para Render:

1. Conecta el repo de GitHub.
2. Configura como Node web service.
3. Build command: `pnpm install && pnpm build`.
4. Start command: `pnpm start`.
5. Variables de entorno: agrega `GEMINI_API_KEY`, `PINECONE_API_KEY` (o lo que uses), `FRONTEND_URL`, etc.
6. Espera el deploy (~5-10 min la primera vez).

Verifica con `curl https://tu-app.onrender.com/health` → debe devolver 200.

Si usas Pinecone (o Chroma Cloud), re-ingestá los docs apuntando a esa instancia antes de probar el chat.

### 04.4 — Deploy del frontend

Si elegiste Vercel:

1. `pnpm dlx vercel` desde la carpeta del frontend (o conectá el repo desde el dashboard).
2. Configurá la URL del backend como variable de entorno (o reemplazá en el JS antes de buildear).
3. Verificá que el widget cargue y conecte al backend live.

### 04.5 — Demo data multi-negocio

Crea 2-3 sets de demo data en `docs/`:

- `docs/pizzeria/` — el set de Epic 02.
- `docs/dentista/` — clínica dental ficticia (servicios, horarios, ubicación, precios orientativos).
- `docs/ecommerce/` — tienda de ropa online ficticia (envíos, devoluciones, métodos de pago, tallas).

Crea un selector simple en el frontend del demo público para cambiar entre negocios. Cada set tiene su propia colección/índice en la vector DB. Tu backend identifica cuál usar por una variable en el request o un path.

**Concepto clave:** muestra que el patrón funciona para distintos verticales. Es lo que un cliente de Fiverr necesita ver para pensar "ah, también sirve para mi negocio". Sin esto, parece un demo de pizzería que funciona solo para pizzerías.

### 04.6 — README de portafolio

Reescribe el README del repo orientado a impresionar a un cliente potencial (no solo a un dev). Estructura sugerida:

1. **Una línea**: qué hace el bot en una frase.
2. **GIF o captura**: el bot en acción (autoplay si es GIF, sin sonido).
3. **Demo URL**: bien visible.
4. **Stack** con badges.
5. **"Qué problemas resuelve para tu negocio"**: en lenguaje de negocio, no técnico ("responde el 80% de consultas comunes sin que tu equipo intervenga", "atiende 24/7", "se entrena con tus propios documentos en 5 minutos").
6. **"Cómo lo integro a mi sitio"**: el snippet de embed con 1 línea de copy-paste.
7. **Casos de uso**: lista con los 3 sets demo (pizzería, dentista, ecommerce).
8. **Cómo está hecho** (sección colapsable o al final, para devs curiosos).

**Concepto clave:** este README va a ser linkeado desde tu perfil de Fiverr. Tiene que vender, no solo documentar. Cliente potencial llega aquí desde Fiverr y debe entender "qué es y para qué me sirve" en 10 segundos.

### 04.7 — Video corto de demo

Graba 60-90 segundos mostrando:

1. Apertura del widget en una página de prueba.
2. Pregunta común → respuesta correcta y rápida (streaming visible).
3. Pregunta fuera de dominio → "no tengo esa info".
4. Cambio entre negocios (pizzería → dentista) para mostrar versatilidad.

Sube a YouTube como "unlisted" o Loom. Linkéalo desde:

- El README del repo.
- Tu perfil de Fiverr.
- Tu LinkedIn.

**Concepto clave:** el video es lo que más convierte en Fiverr. Los clientes no leen READMEs largos — ven 30 segundos de video y deciden.

## Definition of Done

- [ ] Backend live en URL pública con HTTPS
- [ ] Frontend live en URL pública con HTTPS
- [ ] Bot funciona end-to-end en producción (no solo localhost)
- [ ] 3 sets de demo data cargados, selector funcional en el demo público
- [ ] README de portafolio listo (con captura/gif, demo URL, stack, casos de uso)
- [ ] Video demo grabado y linkeado
- [ ] Todo el código pushed a GitHub
- [ ] Rate limits del free tier de Gemini monitoreados (si el demo recibe tráfico real, pegás contra el límite rápido)

## Lo que aprendiste

- Cómo deployar un backend Node.js a producción.
- Manejo de env vars en plataformas de hosting.
- CORS en producción (restrictivo, no `*`).
- Storytelling de un proyecto técnico para audiencia no-técnica.
- Lo que separa "demo de aprendizaje" de "demo vendible".

## Trampas comunes

- Olvidar restringir CORS y dejar el endpoint abierto al mundo → cualquiera puede usar tu API key contra tu cuenta.
- Free tier de Render se duerme después de 15 min de inactividad → el primer request toma ~30s. Mencionalo en el README del demo público ("el primer mensaje puede tardar, el server está despertando").
- Free tier de Gemini son ~15 req/min globales por API key. Si el demo recibe varias visitas a la vez, vas a ver 429s. Mencionalo en el README también, o configurá un mensaje amigable en el frontend ("muchos usuarios ahora mismo, intenta de nuevo en unos segundos").
- README solo técnico → un cliente de Fiverr no entiende "Clean Architecture" ni "RAG". Tradúcelo a problemas de negocio.
- Hardcodear URLs de localhost en el frontend → en prod no funciona y el debug toma horas.
- No probar el demo después de cada cambio → el demo se rompe entre deploys y no te enterás.

## Lo que viene después de esta épica

Ya tenés algo vendible. Lo que sigue (fuera de scope de este workbook):

- **Ofrecer en Fiverr**: armar perfil, gigs, pricing, packages, portfolio samples.
- **Migrar a Claude (Anthropic) cuando tengas ingresos**: gracias a la abstracción con `LLMProvider` en Epic 02, es un cambio de minutos. Solo creás un `AnthropicLLMProvider` que implementa la misma interface y lo intercambias en el composition root.
- **Mejoras de producto**: multi-tenant (un solo backend, varios clientes con sus propias bases), panel admin para que el cliente suba sus docs sin tocar código, integración a WhatsApp Business API.
- **Otros canales de venta**: LinkedIn outreach a pymes locales, posts en grupos de Facebook de dueños de negocio, freelance platforms regionales.

Pero eso ya es trabajo de venta y mejora iterativa, no de aprendizaje técnico. Esta secuencia te dejó con un demo demostrable y los skills para entregarle a un cliente lo que pida.
