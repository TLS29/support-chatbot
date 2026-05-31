import "dotenv/config";
import { GoogleGenAI, type Content } from "@google/genai";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const main = async () => {
  const apiKey = process.env.GEMINI_API_KEY;
  const SYSTEM_INSTRUCTION = `
  Eres el bot de soporte de Pizzería La Italiana, una pizzería en Guadalajara, México.
  Hablas en español mexicano, con tono amable, cercano y casual (puedes usar "¡Qué onda!", "claro que sí", etc.).
  Tu trabajo es ayudar a los clientes con dudas sobre pedidos, horarios y el menú.

  Reglas importantes:
  - Si NO sabes algo o no tienes la información, NO la inventes. Di: "No tengo esa información, déjame conectarte con un humano 🍕".
  - No inventes precios, promociones ni datos del menú. Si te preguntan algo específico que no sabes, escala a un humano.
  - Sé breve y directo. No des respuestas larguísimas.
  - Si no tienes información, de algo del menu, NO LO INVENTES, ya que podria llegar a meter en problemas al negocio si se ofrece algo que no existe, solo la info que sepas que es verdad dila, si no contacta con un humano
  `.trim();

  if (!apiKey) {
    throw new Error("Falta GEMINI_API_KEY en .env");
  }

  const ai = new GoogleGenAI({ apiKey });

  const rl = readline.createInterface({ input, output });

  const historial: Content[] = [];

  while (true) {
    try {
      // Pide input al usuario y ESPERA (await) hasta que escriba algo y dé Enter
      const mensaje = await rl.question("> ");

      // Salida limpia si el usuario escribe "exit"
      if (mensaje.trim().toLowerCase() === "exit") {
        break; // rompe el while y seguimos abajo
      }

      historial.push({ role: "user", parts: [{ text: mensaje }] });

      // Misma llamada de siempre (todavía SIN historial — solo el mensaje actual)
      const response = await ai.models.generateContentStream({
        model: "gemini-2.5-flash-lite",
        contents: historial,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });

      let fullText = "";

      for await (const chunk of response) {
        const t = chunk.text;

        if (t) {
          process.stdout.write(t);
          fullText += t;
        }
      }

      process.stdout.write("\n\n");

      historial.push({ role: "model", parts: [{ text: fullText }] });
    } catch (error) {
      historial.pop();

      const status = (error as { status?: number }).status;

      if (status === 429) {
        console.log(
          "< ¡Uy! 😅 Justo ahora tengo mucha demanda y no puedo responderte bien. Dame unos minutos y vuelve a escribirme, ¿va? 🍕\n",
        );
      } else {
        console.log(
          "< ¡Ups! Estoy teniendo un problemita técnico en este momento. Por favor inténtalo de nuevo en un ratito. 🙏\n",
        );
      }
    }
  }
};

main();
