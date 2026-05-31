import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const main = async () => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Falta GEMINI_API_KEY en .env");
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Hola, ¿cómo estás?",
  });

  console.log(response.text);
};

main();
