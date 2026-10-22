const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    this.genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
  }

  async generateEmbedding(text) {
    if (!this.genAI || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      return this._mockDeterministicEmbedding(text);
    }

    const model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  async generateGroundedAnswer(question, retrievedChunks) {
    const contextBlock = retrievedChunks
      .map(
        (c, i) =>
          `[Source ${i + 1} | Page ${c.estimatedPage} | Chunk #${c.chunkIndex}]: "${c.content}"`
      )
      .join('\n\n');

    const systemPrompt = `You are DocuMind, a strict factual Document Intelligence Assistant.
Answer the user's question using ONLY the provided document context below.
Always cite the exact [Source X, Page Y] in your answer. If the answer cannot be found in the context, state clearly that the document does not contain that information.

CONTEXT:
${contextBlock}

USER QUESTION:
${question}`;

    if (!this.genAI || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      return `[Simulated Grounded RAG Response] Based on [Source 1, Page ${
        retrievedChunks[0]?.estimatedPage || 1
      }], the document states: "${retrievedChunks[0]?.content.slice(
        0,
        180
      )}...". (Configure GEMINI_API_KEY in .env for live LLM synthesis).`;
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(systemPrompt);
    return result.response.text();
  }

  _mockDeterministicEmbedding(text) {
    const clean = text.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    const vec = new Array(64).fill(0);
    const words = clean.split(/\s+/);
    for (const word of words) {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = (hash * 31 + word.charCodeAt(i)) % 64;
      }
      vec[hash] += 1;
    }
    return vec;
  }
}

module.exports = new AIService();
