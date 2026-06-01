# Epic 04 — Deploy + handover al cliente

**Estimación:** 2-3 días.

## Goal

Tener el flow completo de entrega listo: deployar el monorepo completo (api + chroma + widget estático + caddy con HTTPS automático) en un droplet de DigitalOcean. Handover doc profesional + video Loom + procedimiento de revocación de acceso. Y listing de Fiverr listo para vender.

Al final, **tu primer gig en Fiverr es un proceso operacional repetible**, no improvisación.

## Conceptos cubiertos

- Multi-service docker-compose (api + chroma + caddy).
- Caddy como reverse proxy + servidor de estáticos + HTTPS automático con Let's Encrypt.
- VPS provisioning en DigitalOcean.
- Multi-tenant demo (3 verticales).
- Handover doc + video Loom + revocación de accesos.
- Fiverr listing y packaging.

## Pre-requisitos

- Epic 03 completa (widget + API funcionando localmente con docker-compose).
- Cuenta personal en DigitalOcean (para tu demo público).
- Dominio (o subdominio gratis de Cloudflare; o uno barato de Namecheap, ~$10/año).
- Cuenta de Loom (gratis).

## Tickets

### 04.1 — Decidir hosting con el cliente

NO es código, es proceso. Pero importa para tu workflow.

Tres scenarios típicos:

**Scenario A — Cliente con server existente** (~10%):
Te da SSH/IAM limitado. Deployas. Hand off.

**Scenario B — Cliente sin server pero técnico** (~20%):
Le ayudas a abrir cuenta en DigitalOcean/Hetzner a SU nombre, SU billing. Deployas. Hand off.

**Scenario C — Cliente sin server, no técnico** (~70%):
Tú creás el VPS a su nombre con sus datos de pago. Deployas. Hand off + instrucciones para administrar.

En los tres: el cliente paga su infraestructura directamente al proveedor. **NO sos su proveedor de hosting**.

Para tu **demo público** (lo que muestras en Fiverr): tu propia cuenta de DigitalOcean. ~$6/mes. Se amortiza con 1 venta.

### 04.2 — docker-compose multi-service

Actualiza `docker-compose.yml` raíz con los tres servicios:

```yaml
services:
  api:
    build:
      context: .
      dockerfile: packages/api/Dockerfile
    expose: ["3000"]               # solo red interna
    env_file: .env
    restart: unless-stopped
    depends_on: [chroma]

  chroma:
    image: chromadb/chroma
    expose: ["8000"]               # solo red interna
    volumes:
      - chroma-data:/chroma/chroma
    restart: unless-stopped

  caddy:
    image: caddy:2-alpine
    ports: ["80:80", "443:443"]    # único expuesto al host
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy-data:/data
      - caddy-config:/config
      - ./packages/api/public:/srv/public:ro
    restart: unless-stopped
    depends_on: [api]

volumes:
  chroma-data:
  caddy-data:
  caddy-config:
```

**Note importante:** `expose` (solo red interna del compose) vs `ports` (host). Solo Caddy es accesible públicamente. API y Chroma viven en la red interna.

**Deep-dive a Claude Code:** _"Actualiza docker-compose.yml raíz a multi-service: api (build packages/api/Dockerfile, expose 3000), chroma (expose 8000, volumen persistente), caddy (image caddy:2-alpine, ports 80/443, volúmenes Caddyfile + caddy-data + caddy-config + read-only mount de packages/api/public). Solo Caddy expuesto al host. depends_on en orden chroma → api → caddy."_

### 04.3 — Caddyfile (HTTPS automático)

`Caddyfile` en raíz:

```
{$DOMAIN} {
    # Widget estático: Caddy lo sirve directo (más rápido que Express)
    handle /widget/* {
        root * /srv/public
        file_server
    }

    handle /demo/* {
        root * /srv/public
        file_server
    }

    # API: reverse proxy a Express
    handle /api/* {
        reverse_proxy api:3000
    }

    handle /health/* {
        reverse_proxy api:3000
    }

    # Fallback
    handle {
        respond "Chatbot API · {$DOMAIN}" 200
    }

    encode gzip
    log
}
```

`DOMAIN` viene de `.env` (ej. `api.cliente.com`).

Caddy obtiene certificado de Let's Encrypt automáticamente la primera vez que arranca (cuando el dominio resuelve al IP del droplet).

**Concepto clave:** Caddy en este setup hace 3 cosas:
1. Reverse proxy a `/api/*` y `/health/*`.
2. Servidor de estáticos para `/widget/*` y `/demo/*` (más rápido que Express).
3. HTTPS automático con Let's Encrypt (cero configuración manual).

**Deep-dive a Claude Code:** _"Crea Caddyfile en raíz que: usa {$DOMAIN} de env, handle /widget/* y /demo/* sirviendo desde /srv/public (file_server), handle /api/* y /health/* reverse_proxy a api:3000, fallback 200 con 'Chatbot API'. encode gzip. log enabled. Documenta cómo Let's Encrypt se obtiene automático cuando el DNS apunta correctamente."_

### 04.4 — Provisioning del droplet

Documenta en `docs/deploy.md`:

```bash
# 1. Crear droplet en DigitalOcean
#    - Ubuntu 22.04 LTS
#    - Plan básico $6/mes (1GB RAM, 25GB disk)
#    - Región más cercana al cliente
#    - SSH key del cliente añadida

# 2. Apuntar DNS A record api.cliente.com → IP del droplet
#    (En el proveedor de dominio del cliente)

# 3. SSH al droplet como root
ssh root@<ip>

# 4. Update + install Docker
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh

# 5. Clonar el repo
cd /opt
git clone <repo-url> chatbot
cd chatbot

# 6. Crear .env del cliente
cat > .env <<'EOF'
NODE_ENV=production
PORT=3000
DOMAIN=api.cliente.com
GEMINI_API_KEY=...
SYSTEM_PROMPT="Eres el bot de soporte de Pizzería..."
ALLOWED_ORIGINS=https://cliente.com,https://www.cliente.com
CHROMA_URL=http://chroma:8000
SIMILARITY_THRESHOLD=0.3
RATE_LIMIT_PER_MIN=10
MAX_HISTORY_MESSAGES=40
LOG_LEVEL=info
EOF

# 7. Build widget primero (el api Dockerfile no lo construye)
docker run --rm -v $(pwd):/app -w /app node:20-alpine sh -c "corepack enable && pnpm install --frozen-lockfile && pnpm --filter widget build"
# (O si tienes Node + pnpm en el host, simplemente: pnpm install && pnpm --filter widget build)

# 8. Levantar todo
docker compose up -d --build

# 9. Esperar ~30 segundos a que Caddy obtenga el certificado de Let's Encrypt

# 10. Ingestar docs del cliente
docker compose exec api pnpm ingest

# 11. Verificar
curl https://api.cliente.com/health/live
```

**Concepto clave:** del "droplet vacío" a "bot funcionando con HTTPS" toma ~20 minutos una vez que tienes la mecánica. Documentalo bien — lo vas a hacer 20 veces.

### 04.5 — Demo público multi-negocio

Para tu PROPIO demo (no de cliente), prepara 3 sets de docs:

```
docs/
├── pizzeria/
├── dentista/
└── ecommerce/
```

Cada uno con su propia colección en Chroma (`support-knowledge-pizzeria`, `support-knowledge-dentista`, `support-knowledge-ecommerce`).

Esto requiere un pequeño extension del API: aceptar un `businessId` opcional en `ChatRequest` que se mapea a la colección a usar. Update mínimo en:
- `packages/shared/src/api-contract.ts`: agregar `businessId?: string` a `ChatRequest`.
- `SendMessageUseCase`: aceptar `businessId` y pasarlo al `KnowledgeRepository`.
- `ChromaKnowledgeRepository`: aceptar el nombre de la colección como parámetro.

En el widget del demo, agrega un selector que cambia el `businessId` que se manda.

**Concepto clave:** muestra a clientes que tu producto funciona en varios verticales, no solo pizzerías. Diferencia entre "demo de pizzería" y "infraestructura para cualquier soporte".

**Deep-dive a Claude Code:** _"Extiende ChatRequest en packages/shared para incluir businessId?. Update SendMessageUseCase y ChromaKnowledgeRepository para aceptar el nombre de la colección dinámicamente. En packages/widget/src/App.tsx agrega un selector simple de negocio que cambia el businessId. Crea 3 sets de docs en docs/pizzeria/, docs/dentista/, docs/ecommerce/ con info inventada coherente."_

### 04.6 — Handover doc template

Crea `templates/handover-template.md`. Por cada cliente real generas un PDF customizado.

Estructura:

```
# Handover · {Nombre del cliente}

## Resumen ejecutivo (1 página, lenguaje no técnico)
- Qué hace tu bot
- Dónde vive (URL)
- Canales activos
- Limitaciones conocidas

## Credenciales y accesos
- Hosting: {proveedor} droplet "{nombre}"
  - Cuenta: del cliente, login en {proveedor}.com
- API key de Gemini: del cliente, login en aistudio.google.com
- DNS: proveedor del cliente; record api.cliente.com → IP del droplet

## Operación diaria
- Verificar vivo: https://api.cliente.com/health/live (debe decir "ok")
- Ver logs: ssh al droplet → docker compose logs api -f
- Reiniciar: docker compose restart api
- Apagar/encender: docker compose down / up -d

## Mantenimiento
- Actualizar docs del bot:
  1. Editar archivos en /opt/chatbot/docs/
  2. docker compose exec api pnpm ingest
- Cambiar system prompt:
  1. Editar SYSTEM_PROMPT en /opt/chatbot/.env
  2. docker compose restart api
- Cambiar branding del widget:
  - Editar VITE_BOT_NAME, VITE_PRIMARY_COLOR en /opt/chatbot/.env del widget
  - Re-build: pnpm --filter widget build
  - docker compose restart caddy (para recargar estáticos)

## Seguridad: cómo revocar mi acceso
Al terminar el proyecto, cuando ya no querás que tenga acceso:
1. Cambiar password de {proveedor de hosting}
2. Rotar la API key de Gemini (regenerar en aistudio.google.com)
3. Eliminar mi SSH key del droplet:
   ssh root@<ip>
   nano ~/.ssh/authorized_keys
   (eliminar la línea que dice "ssh-rsa ... jonathan@...")
4. Verificar: intentar conectar conmigo debe fallar

## Soporte
- Incluido en el paquete: {N} días post-entrega
- Después: ${X}/hora o paquete mensual de mantenimiento
- Contacto: tu@email.com
```

**Concepto clave:** este doc es lo que más te diferencia. La mayoría entrega código y se va. Tú entregás manual + procedimiento de revocación = profesionalismo nivel agency.

### 04.7 — Loom video de handover

Graba 5-10 minutos:

1. (1 min) Saludo + qué construiste.
2. (2 min) Tour de la web con el widget funcionando.
3. (1 min) Cómo verificar vivo.
4. (2 min) Cómo actualizar docs (editar + `pnpm ingest`).
5. (1 min) Dónde está el handover doc + procedimiento de revocación.
6. (30 seg) Cómo contactarte.

Sube como "unlisted" en Loom (gratis). Linkéalo desde el handover doc.

**Concepto clave:** el video convierte más que el PDF. Clientes ven 30 segundos y entienden.

### 04.8 — README de portafolio + Fiverr listing

Reescribe el README principal del repo para clientes potenciales (no devs):

1. Una línea: qué hace.
2. GIF/captura: bot funcionando.
3. Demo URL bien visible.
4. Stack (badges visuales).
5. **Qué problemas resuelve** (lenguaje de negocio, no técnico).
6. **Cómo se integra** (1 línea de embed: `<script src="..."></script>`).
7. **Casos de uso**: links a los 3 sets demo.
8. Cómo está hecho (sección colapsable al final para devs curiosos).

Para Fiverr:

- **Title:** "AI customer support chatbot trained on YOUR business documents"
- **3 packages:**
  - **Básico** ($80-150): bot con tus FAQs, deployado en VPS ya existente.
  - **Completo** ($200-400): incluye widget de web + setup completo de VPS.
  - **Premium** ($500-1000): incluye 1 canal extra (WhatsApp) + 14 días de soporte.
- **Pricing inicial:** empezá bajo para conseguir primeras reviews, subí después.

## Definition of Done

- [ ] Demo público live en HTTPS (Caddy + Let's Encrypt)
- [ ] Widget embebido en demo público (3 verticales seleccionables)
- [ ] Multi-business funciona end-to-end
- [ ] `templates/handover-template.md` listo
- [ ] Video Loom de handover grabado (template para customizar por cliente)
- [ ] README de portafolio listo
- [ ] Gig de Fiverr publicado o draft listo
- [ ] `docs/deploy.md` con procedimiento paso a paso
- [ ] Commits por ticket

## Lo que aprendiste

- Deploy de monorepo Node a producción.
- Caddy como reverse proxy + HTTPS automático (zero-config).
- Multi-service docker-compose con red interna.
- Workflow completo de entrega Fiverr profesional.
- Cómo presentar trabajo técnico a audiencia no-técnica.

## Trampas comunes

- DNS no propagado antes de levantar Caddy → Let's Encrypt falla.
- Olvidar `expose` vs `ports` → API queda accesible públicamente sin pasar por Caddy.
- Caddy sin acceso al volumen `packages/api/public` → 404 en widget assets.
- Sin `depends_on` → api arranca antes que Chroma, falla `/health/ready` un rato.
- Free tier de Gemini se quema si el demo público recibe muchas visitas → cuando vendas, cada cliente trae su propia API key.
- Handover doc demasiado técnico → cliente no lo lee. Apunta a "1 página executive + detalles para nerds al final".
- No grabar el Loom porque "después" → te ahorra horas de soporte post-venta.

## Lo que viene después

Esta secuencia te dejó con:
- Un demo vendible.
- Un template reutilizable.
- Un proceso de entrega profesional.
- Material listo para Fiverr.

**Lo siguiente es vender, no construir más.** Resistí la tentación de meter features antes de tener clientes. Cuando tengas 3-5 gigs, ahí van a aparecer features que el mercado pidió. Ese es el momento de iterar.

Posibles iteraciones futuras (NO ahora):
- Multi-tenant (1 instalación, varios clientes con sus propias bases).
- Panel admin para que el cliente actualice docs sin SSH.
- Canales adicionales (WhatsApp, Telegram, etc.).
- Métricas / analytics del bot.
- Switch de Gemini a Claude cuando tengas ingresos (gracias a `LLMProvider`, minutos).
