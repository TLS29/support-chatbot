# Epic 01 — Conversación con LLM

**Estimación:** 3-4 días.

## Goal

Tener un chatbot de consola con el que puedas conversar de verdad: mantiene el contexto de mensajes anteriores, responde con una personalidad consistente vía system instruction, hace streaming de la respuesta, y maneja errores básicos.

**Lo que NO hace todavía:** saber nada del negocio del cliente. Eso es lo que vas a agregar en Epic 02 con RAG. Por ahora el bot responde con conocimiento general del LLM.

## Conceptos cubiertos

- **Cómo el LLM maneja "memoria"**: no la tiene. Tú le mandas el historial cada vez.
- **System instruction**: el prompt que define personalidad, reglas, y comportamiento esperado.
- **Streaming**: recibir la respuesta token por token mientras se genera.
- **Manejo de errores**: rate limits, network errors, API errors.

## Pre-requisitos

- Epic 00 completa.

## Tickets

### 01.1 — Conversación single-turn desde argumento de CLI

Refactoriza el script de Epic 00 para que reciba el mensaje desde la línea de comandos en lugar de tenerlo hardcoded:

```
pnpm dev "¿Cuál es la capital de Francia?"
```

Si no se pasa argumento, imprime un usage hint y sale con código 1.

**Concepto clave:** todavía sin memoria. Cada invocación es independiente. Sentí esto antes de agregarle memoria — para entender qué problema resuelve el historial.

**Deep-dive a Claude Code:** _"Modifica src/index.ts para que reciba el mensaje del usuario desde process.argv[2]. Si no hay argumento, imprime 'usage: pnpm dev \"tu mensaje\"' y sale con código 1."_

### 01.2 — Modo interactivo con readline

Cambia el flujo: en lugar de pasar el mensaje como argumento, abre un loop interactivo en consola donde el usuario escribe, el bot responde, y se vuelve a pedir otro mensaje. Termina con `exit` o Ctrl+C.

Ejemplo de cómo se ve:

```
> Hola
< Hola! ¿En qué puedo ayudarte?
> ¿Te acuerdas de mi nombre? Me llamo Jonathan.
< Sí, claro Jonathan. ¿En qué puedo ayudarte?
> ¿Cuál era mi nombre?
< No tengo registro de tu nombre. ← acá ves el problema
```

**Concepto clave:** sin memoria, el bot olvida instantáneamente. Esto es lo que vas a resolver en el siguiente ticket.

**Deep-dive a Claude Code:** _"Convierte el script en un REPL interactivo usando el módulo readline de Node. Pide input al usuario en loop, manda al LLM, imprime respuesta. Cierra con 'exit' o Ctrl+C limpiamente."_

### 01.3 — Agregar memoria de conversación

Mantén un array con el historial de la conversación. En cada llamada al LLM, manda el historial completo, no solo el último mensaje. En Gemini, el formato del historial es:

```ts
contents: [
  { role: 'user', parts: [{ text: 'Hola' }] },
  { role: 'model', parts: [{ text: '¡Hola! ¿En qué puedo ayudarte?' }] },
  { role: 'user', parts: [{ text: 'Mi nombre es Jonathan' }] },
  // ...
]
```

**Importante:** en Gemini el rol del bot se llama `'model'`, NO `'assistant'` (como sería en OpenAI o Anthropic). Después de cada respuesta del modelo, agregás un turno `{ role: 'model', parts: [...] }` al array.

Alternativamente, Gemini tiene un helper `ai.chats.create({ model, config })` que mantiene el historial automáticamente. Puedes usar cualquiera de los dos enfoques — empezar manual te hace ver el patrón claro; el helper es más limpio pero esconde el mecanismo.

**Recomendación:** hacelo manual primero. Una vez que veas el array creciendo turno por turno, sabés exactamente qué está pasando bajo el capó.

**Concepto clave:** esto es lo único que "da memoria" a un chatbot. El LLM sigue siendo stateless — somos nosotros los que le re-mandamos el contexto cada vez. Este es **el patrón fundamental** de todos los chatbots, no importa el provider.

**Detalle a vigilar (no lo arregles ahora, solo anótalo):** el historial crece sin parar. En conversaciones largas puede pegar contra el límite de tokens del modelo. Más adelante hay que limitar el tamaño o resumir.

**Deep-dive a Claude Code:** _"Agrega un array de historial al REPL en formato Gemini (role 'user' o 'model', parts con text). Mandalo completo en cada llamada generateContent. Después de cada respuesta, agrega el turno del modelo al historial. Imprime el largo del historial después de cada turno para visualizar cómo crece."_

### 01.4 — System instruction para definir personalidad

Agrega el campo `systemInstruction` dentro de `config` al `generateContent`. Esto NO es un mensaje en el array `contents` — es un campo aparte de la API. Empieza con algo simple:

```
Eres el bot de soporte de Pizzería La Italiana, una pizzería en Guadalajara.
Hablas en español mexicano, con tono amable y casual.
Si no sabes algo, dices "no tengo esa información, déjame conectarte con un humano".
```

Se pasa al SDK así:

```ts
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: historial,
  config: {
    systemInstruction: 'Eres el bot de soporte de...'
  }
});
```

**Concepto clave:** la system instruction es lo que más diferencia un chatbot bueno de uno malo. Es donde le dices las reglas: tono, qué puede y qué no puede decir, cómo manejar dudas, cuándo escalar. **Aquí está el 50% del valor que entregas a un cliente de Fiverr** — saber escribir buenas system instructions.

**Deep-dive a Claude Code:** _"Agrega el campo systemInstruction dentro de config en el call de generateContent. Hardcodea por ahora una system instruction para el bot de una pizzería ficticia. Debe enfatizar decir 'no sé' en lugar de inventar."_

### 01.5 — Streaming de respuestas

Cambia el call de `ai.models.generateContent({ ... })` a `ai.models.generateContentStream({ ... })`. Lee los chunks a medida que llegan e imprímelos sin newline (`process.stdout.write(...)`). Al final del stream, agrega el mensaje completo al historial.

```ts
const stream = await ai.models.generateContentStream({ model, contents, config });

let fullText = '';
for await (const chunk of stream) {
  const t = chunk.text;
  if (t) {
    process.stdout.write(t);
    fullText += t;
  }
}
// Agregar fullText al historial como { role: 'model', parts: [{ text: fullText }] }
```

**Concepto clave:** para una buena UX, el usuario no debería esperar 5 segundos para ver una respuesta completa. Streaming le muestra el texto a medida que se genera, igual que ChatGPT. Es un detalle de UX, pero es el que separa "demo de juguete" de "demo profesional" cuando un cliente ve tu bot.

**Deep-dive a Claude Code:** _"Cambia generateContent a generateContentStream. Imprime cada chunk.text sin newline a medida que llega (usa process.stdout.write). Acumulá el texto completo en una variable y al cerrar el stream, guardalo en el historial como un turno 'model'."_

### 01.6 — Manejo de errores básico

Envuelve la llamada al LLM en un try/catch. Captura los errores que el SDK de Google puede tirar:

- Errores HTTP (4xx, 5xx) — incluido `429 Too Many Requests` si pegás contra el rate limit del free tier.
- Errores de red, timeouts.

Imprime un mensaje amigable al usuario en lugar de un stack trace. **No mueras** — el REPL debe seguir aceptando input.

**Concepto clave:** los rate limits del free tier de Gemini son ~15 requests por minuto. Si experimentás mucho seguido, vas a pegar contra ellos. En producción tendrías retry con backoff exponencial. Por ahora basta con manejarlos sin morir y avisar al usuario.

**Deep-dive a Claude Code:** _"Envuelve el call al SDK en try/catch. Si el error tiene status 429 (rate limit) imprime un mensaje pidiendo paciencia (ej: 'demasiadas requests, esperá unos segundos'). Cualquier otro error: imprime mensaje genérico amigable. En ambos casos el REPL sigue vivo."_

## Definition of Done

- [ ] REPL interactivo funciona (puedes mandar varios mensajes seguidos)
- [ ] El bot recuerda mensajes anteriores dentro de una sesión
- [ ] La system instruction define una personalidad consistente
- [ ] Las respuestas se imprimen en streaming (texto aparece a medida que se genera)
- [ ] Si la API falla, no muere el programa — imprime error y sigue
- [ ] Al menos un commit por ticket (siguiendo conventional commits)

## Lo que aprendiste

- Por qué el LLM "no tiene memoria" y cómo se le da memoria.
- Cómo se estructura una buena system instruction para un caso real.
- Diferencia entre `generateContent` y `generateContentStream`.
- Manejo de errores del SDK.
- Convenciones específicas de Gemini: `role: 'model'`, `parts: [{ text }]`, `systemInstruction` en `config`.

## Trampas comunes

- Olvidar agregar la respuesta del modelo al historial → el bot se "amnesia" cada turno.
- Usar `role: 'assistant'` en lugar de `role: 'model'` → Gemini falla porque ese role no existe. **Esto es lo que más confunde a quien viene de OpenAI o Anthropic.**
- Meter la system instruction en el array `contents` con `role: 'system'` → en Gemini no existe ese role. La system instruction es un campo aparte (`config.systemInstruction`).
- Hacer streaming sin acumular el texto en un buffer → terminás con un turno vacío en el historial.
- Empezar a hardcodear conocimiento de negocio en la system instruction ("la pizza margarita cuesta $150") → eso es lo que vamos a resolver con RAG en Epic 02. La system instruction es para **personalidad y reglas**, NO para datos del negocio.
- No manejar el error de `429 Too Many Requests` — con free tier de 15 req/min lo vas a ver más seguido de lo que crees mientras experimentás.
