import fs from "node:fs/promises";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { env } from "#infrastructure/config/env";
import { GeminiEmbeddingProvider } from "#infrastructure/rag/gemini-embedding-provider";
import { ChromaKnowledgeRepository } from "#infrastructure/rag/chroma-knowledge-repository";
import chunkText from "#infrastructure/rag/chunker";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("🚀 Iniciando ingesta de documentos...");

  const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });
  const embeddingProvider = new GeminiEmbeddingProvider(ai);
  const repo = new ChromaKnowledgeRepository();
  await repo.reset();

  // Como corremos el script desde packages/api (vía pnpm --filter api),
  // nuestro directorio actual es packages/api. Tenemos que subir dos niveles para llegar a la raíz.
  const docsDir = path.join(process.cwd(), "../../docs");
  const files = await fs.readdir(docsDir);
  const mdFiles = files.filter((f) => f.endsWith(".md"));

  for (const file of mdFiles) {
    console.log(`\n📄 Procesando: ${file}...`);

    const content = await fs.readFile(path.join(docsDir, file), "utf-8");
    const chunks = chunkText(content, 400);

    console.log(`   Cortado en ${chunks.length} pedazos.`);

    for (let i = 0; i < chunks.length; i++) {
      const text = chunks[i];
      console.log(`   Traduciendo pedazo ${i + 1}/${chunks.length} a vectores...`);

      const embedding = await embeddingProvider.embed(text);

      await repo.add([
        {
          text,
          embedding,
          metadata: { source: file },
        },
      ]);

      if (i < chunks.length - 1) {
        await delay(4000);
      }
    }
    console.log(`✅ ${file} guardado en Chroma.`);
  }

  console.log("\n🎉 ¡Ingesta completada! Tu base de datos está lista.");
}

main().catch(console.error);
