# Epic 00 — Setup

**Estimación:** 1 día (~2-3 hrs).

## Goal

Tener un proyecto Node.js + TypeScript con el SDK de Google Gen AI listo para usar, y verificar que tu API key funciona haciendo una llamada de "hola mundo" al modelo Gemini. Nada más. **No estamos construyendo el chatbot todavía** — estamos asegurándonos que las piezas mínimas funcionen.

## Conceptos cubiertos

- Inicializar un proyecto con `pnpm init` y configurar TypeScript strict.
- Manejo de variables de entorno con `.env` (y por qué `.env` nunca va a git).
- SDK de Google Gen AI: instalación, autenticación, llamada básica.
- Diferencia entre `pnpm dev` (con `tsx`) y `pnpm build` (con `tsc`).

## Pre-requisitos

- Node 20+ y pnpm instalados.
- Cuenta en Google AI Studio (https://aistudio.google.com/app/apikey).
- API key generada y guardada en lugar seguro.

## Tickets

### 00.1 — Crear proyecto e instalar dependencias

Desde `~/Documents/practicas/chatbot-soporte/`:

```
pnpm init
pnpm add @google/genai dotenv
pnpm add -D typescript tsx @types/node
```

**Concepto clave:** `@google/genai` es el SDK oficial unificado de Google para Gemini API y Vertex AI. `dotenv` lee variables de un archivo `.env`. `tsx` te deja correr archivos `.ts` sin compilar (para desarrollo). `@types/node` son los tipos de Node (sin esto TS no conoce `process`, `fs`, etc.).

**Deep-dive a Claude Code:** _"Inicializa un proyecto Node.js + TypeScript con pnpm en este directorio. Necesito @google/genai, dotenv, tsx, typescript y @types/node. No configures nada más, solo instala."_

### 00.2 — Configurar TypeScript

Crear `tsconfig.json` con strict máximo. Mínimo necesario:

- `strict: true`
- `noUncheckedIndexedAccess: true`
- `target: ES2022`
- `module: NodeNext`
- `moduleResolution: NodeNext`
- `outDir: dist`
- `rootDir: src`
- `esModuleInterop: true`

**Concepto clave:** `noUncheckedIndexedAccess` es el flag que más se olvida. Hace que `arr[0]` devuelva `T | undefined` en lugar de `T`. Sin esto, tu type safety es la mitad de fuerte de lo que crees.

**Deep-dive a Claude Code:** _"Genera un tsconfig.json para un proyecto Node.js + TS con strict máximo. Justifica cada flag, especialmente noUncheckedIndexedAccess."_

### 00.3 — Estructura de carpetas y scripts en package.json

Estructura inicial:

```
chatbot-soporte/
├── src/
│   └── index.ts
├── .env
├── .env.example
├── .gitignore
├── package.json
└── tsconfig.json
```

Scripts en `package.json`:

- `"dev": "tsx watch src/index.ts"` — corre con hot reload
- `"build": "tsc"` — compila a `dist/`
- `"start": "node dist/index.js"` — corre el compilado

**Concepto clave:** durante desarrollo usas `tsx` (rápido, no compila a disco). Para producción compilas con `tsc` y corres con `node dist/index.js`.

### 00.4 — Configurar `.env` y `.gitignore`

`.env`:

```
GEMINI_API_KEY=tu-key-de-google-ai-studio
```

`.env.example` (este SÍ va a git, sin la key real):

```
GEMINI_API_KEY=
```

`.gitignore`:

```
node_modules/
dist/
.env
```

**Concepto clave:** `.env` jamás va a git (contiene secretos). `.env.example` sí va, para que otros sepan qué variables necesitan. Filtrar una API key a un repo público es una forma común de gastar dinero en llamadas no autorizadas. En el free tier de Gemini el daño máximo es que te rate-limiteen, pero más adelante (o en otros providers) sería un problema serio — adquirí el hábito desde ahora.

### 00.5 — "Hello world" al LLM

En `src/index.ts`, escribe un script mínimo que:

1. Cargue las variables con `dotenv` (`import 'dotenv/config'`).
2. Instancie el cliente de Google Gen AI con tu API key.
3. Mande un mensaje simple ("Hola, ¿cómo estás?") al modelo `gemini-2.5-flash`.
4. Imprima la respuesta en consola.

**Concepto clave:** la llamada al LLM se ve así:

```ts
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: 'Hola, ¿cómo estás?'
});

console.log(response.text);
```

La respuesta es `response.text` (un string directo). No hay que andar buceando en arrays de bloques.

**Deep-dive a Claude Code:** _"Escribe un script mínimo en src/index.ts que: cargue dotenv, instancie el cliente de @google/genai con GEMINI_API_KEY del env, mande el mensaje 'Hola, ¿cómo estás?' al modelo gemini-2.5-flash, y imprima response.text en consola. Comenta cada línea para que se entienda."_

### 00.6 — Commit inicial

```
git init
git add .
git commit -m "epic 00: setup project with google gen ai sdk"
```

(El push a GitHub puede esperar hasta que tengas algo más sustancioso. O puedes crear el repo ya y empezar a subir desde aquí — tu llamada.)

## Definition of Done

- [ ] `pnpm dev` corre `src/index.ts` sin errores
- [ ] `pnpm build` compila a `dist/` sin errores
- [ ] La llamada a la API devuelve una respuesta del modelo
- [ ] Imprimes la respuesta en la consola
- [ ] `.env` está en `.gitignore` (verifica con `git status` que NO aparece)
- [ ] Commit inicial hecho

## Lo que aprendiste

- Cómo iniciar un proyecto Node + TS desde cero con pnpm.
- Cómo se autentica al SDK de Google Gen AI.
- La estructura básica de una llamada `generateContent`.
- Por qué `.env` nunca va a git.

## Trampas comunes

- Usar `npm` o `npx` por costumbre — siempre `pnpm` en este repo.
- Hardcodear la API key en `src/index.ts` "solo para probar" — siempre desde `.env`.
- Olvidar `.env` en `.gitignore` y subir la API key a GitHub. Si pasa: revoca y regenera la key inmediatamente en Google AI Studio.
- Confundir `tsx` (TypeScript executor) con TSX (sintaxis JSX de React). No son lo mismo.
- Usar el SDK viejo `@google/generative-ai` en lugar del nuevo unificado `@google/genai`. Los dos existen y funcionan, pero `@google/genai` es el actual y recomendado.
