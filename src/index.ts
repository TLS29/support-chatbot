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
  `.trim();

  if (!apiKey) {
    throw new Error("Falta GEMINI_API_KEY en .env");
  }

  const ai = new GoogleGenAI({ apiKey });

  const rl = readline.createInterface({ input, output });

  const historial: Content[] = [];

  while (true) {
    // Pide input al usuario y ESPERA (await) hasta que escriba algo y dé Enter
    const mensaje = await rl.question("> ");

    // Salida limpia si el usuario escribe "exit"
    if (mensaje.trim().toLowerCase() === "exit") {
      break; // rompe el while y seguimos abajo
    }

    historial.push({ role: "user", parts: [{ text: mensaje }] });

    // Misma llamada de siempre (todavía SIN historial — solo el mensaje actual)
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: historial,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    historial.push({ role: "model", parts: [{ text: response.text ?? "" }] });

    console.log(`< ${response.text}\n`);
  }
};

main();
