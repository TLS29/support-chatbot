const chunkText = (text: string, maxSize: number = 500): string[] => {
  if (!text || text.trim() === "") return [];

  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    if (trimmed.length <= maxSize) {
      chunks.push(paragraph);
    } else {
      const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || [trimmed];
      let currentChunk = "";

      for (const sentence of sentences) {
        const sentenceTrimmed = sentence.trim();
        if (!sentenceTrimmed) continue;

        if (
          (currentChunk + " " + sentenceTrimmed).length > maxSize &&
          currentChunk.length > 0
        ) {
          chunks.push(currentChunk.trim());
          currentChunk = "";
        }

        currentChunk += (currentChunk ? " " : "") + sentenceTrimmed;
      }

      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
      }
    }
  }

  return chunks;
};

export default chunkText;
