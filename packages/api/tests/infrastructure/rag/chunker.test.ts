import test from "node:test";
import assert from "node:assert/strict";
import chunkText from "#infrastructure/rag/chunker.js";

test("chunkText - debe retornar un array vacío si el texto está vacío o solo tiene espacios", () => {
  assert.deepEqual(chunkText(""), []);
  assert.deepEqual(chunkText("   "), []);
});

test("chunkText - debe mantener los párrafos cortos enteros sin partirlos", () => {
  const texto = "Este es un párrafo corto.\n\nY este es otro párrafo.";
  const chunks = chunkText(texto, 500);

  assert.deepEqual(chunks, [
    "Este es un párrafo corto.",
    "Y este es otro párrafo.",
  ]);
});

test("chunkText - debe partir un párrafo largo por oraciones si supera el maxSize", () => {
  const texto =
    "Esta es la primera oración. Esta es la segunda. Y aquí está la tercera.";

  // Límite artificial bajo para forzar el particionamiento
  const chunks = chunkText(texto, 30);

  assert.deepEqual(chunks, [
    "Esta es la primera oración.",
    "Esta es la segunda.",
    "Y aquí está la tercera.",
  ]);
});

test("chunkText - debe manejar una oración súper larga manteniendo el 'límite suave'", () => {
  const texto = "A".repeat(600);
  const chunks = chunkText(texto, 500);

  assert.deepEqual(chunks, [texto]);
});
