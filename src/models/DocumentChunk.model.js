const mongoose = require('mongoose');

const documentChunkSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    chunkIndex: { type: Number, required: true },
    content: { type: String, required: true },
    estimatedPage: { type: Number, default: 1 },
    charCount: { type: Number, required: true },
    embedding: { type: [Number], required: true },
  },
  { timestamps: true }
);

// MongoDB Full-Text Search Index for Hybrid Retrieval (Keyword + Vector)
documentChunkSchema.index({ content: 'text' });

module.exports = mongoose.model('DocumentChunk', documentChunkSchema);
