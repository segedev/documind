const chunkTextWithOverlap = (text, chunkSize = 600, overlap = 100) => {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  if (!cleanText) return [];

  const chunks = [];
  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < cleanText.length) {
    const endIndex = Math.min(startIndex + chunkSize, cleanText.length);
    const slice = cleanText.slice(startIndex, endIndex).trim();

    if (slice.length > 0) {
      // Estimate page number based on ~1800 characters per standard page
      const estimatedPage = Math.floor(startIndex / 1800) + 1;
      chunks.push({
        chunkIndex,
        content: slice,
        estimatedPage,
        charCount: slice.length,
      });
      chunkIndex++;
    }

    if (endIndex === cleanText.length) break;
    startIndex += chunkSize - overlap;
  }

  return chunks;
};

module.exports = { chunkTextWithOverlap };
