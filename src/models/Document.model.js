const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    originalFilename: { type: String, required: true },
    mimeType: { type: String, required: true },
    status: {
      type: String,
      enum: ['QUEUED', 'PROCESSING', 'INDEXED', 'FAILED'],
      default: 'QUEUED',
      index: true,
    },
    totalChunks: { type: Number, default: 0 },
    totalCharacters: { type: Number, default: 0 },
    processingTimeMs: { type: Number, default: 0 },
    errorMessage: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', documentSchema);
