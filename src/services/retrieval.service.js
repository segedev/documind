const mongoose = require('mongoose');
const DocumentChunk = require('../models/DocumentChunk.model');
const aiService = require('./ai.service');
const { cosineSimilarity } = require('../utils/math.util');

class RetrievalService {
  async hybridSearch(documentId, query, topK = 4) {
    const queryEmbedding = await aiService.generateEmbedding(query);
    const queryTerms = query
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2);

    const chunks = await DocumentChunk.find({
      documentId: new mongoose.Types.ObjectId(documentId),
    }).lean();

    if (!chunks.length) return [];

    const scoredChunks = chunks.map((chunk) => {
      const vectorScore = Math.max(0, cosineSimilarity(queryEmbedding, chunk.embedding));

      const contentLower = chunk.content.toLowerCase();
      let matchedTerms = 0;
      for (const term of queryTerms) {
        if (contentLower.includes(term)) matchedTerms++;
      }
      const keywordScore = queryTerms.length > 0 ? matchedTerms / queryTerms.length : 0;

      const hybridScore = Number((vectorScore * 0.7 + keywordScore * 0.3).toFixed(4));

      return {
        chunkIndex: chunk.chunkIndex,
        estimatedPage: chunk.estimatedPage,
        content: chunk.content,
        vectorScore: Number(vectorScore.toFixed(4)),
        keywordScore: Number(keywordScore.toFixed(4)),
        hybridScore,
      };
    });

    scoredChunks.sort((a, b) => b.hybridScore - a.hybridScore);
    return scoredChunks.slice(0, topK);
  }
}

module.exports = new RetrievalService();
