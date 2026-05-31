import "dotenv/config";
import { GoogleGenAI, type Content } from "@google/genai";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const main = async () => {
  const apiKey = process.env.GEMINI_API_KEY;

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
    });

    historial.push({ role: "model", parts: [{ text: response.text ?? "" }] });

    console.log(`< ${response.text}\n`);
  }
};

main();
