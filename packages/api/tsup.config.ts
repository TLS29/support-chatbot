import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/main.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true, // Borra dist/ antes de cada build (asegura output fresco).
  sourcemap: true,
  dts: false, // No generamos declaration files (no se publica este package).
  splitting: false, // Una sola salida JS, no chunks.
});
