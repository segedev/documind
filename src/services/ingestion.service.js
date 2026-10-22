const pdfParse = require('pdf-parse');
const Document = require('../models/Document.model');
const DocumentChunk = require('../models/DocumentChunk.model');
const { chunkTextWithOverlap } = require('../utils/chunker.util');
const aiService = require('./ai.service');

class IngestionService {
  enqueueDocumentIngestion(documentId, fileBuffer, mimeType, rawTextFallback = '') {
    setImmediate(async () => {
      const startTime = Date.now();
      try {
        await Document.findByIdAndUpdate(documentId, { status: 'PROCESSING' });

        let extractedText = rawTextFallback;

        if (fileBuffer) {
          if (mimeType === 'application/pdf') {
            const pdfData = await pdfParse(fileBuffer);
            extractedText = pdfData.text;
          } else {
            extractedText = fileBuffer.toString('utf-8');
          }
        }

        const chunkSize = parseInt(process.env.CHUNK_SIZE || '600', 10);
        const overlap = parseInt(process.env.CHUNK_OVERLAP || '100', 10);
        const rawChunks = chunkTextWithOverlap(extractedText, chunkSize, overlap);

        if (rawChunks.length === 0) {
          throw new Error('No extractable text found in the provided document.');
        }

        // Generate embeddings for each chunk and prepare bulk insertion payload
        const chunkDocs = [];
        for (const chunk of rawChunks) {
          const embedding = await aiService.generateEmbedding(chunk.content);
          chunkDocs.push({
            documentId,
            chunkIndex: chunk.chunkIndex,
            content: chunk.content,
            estimatedPage: chunk.estimatedPage,
            charCount: chunk.charCount,
            embedding,
          });
        }

        // High-performance batch insert into MongoDB
        await DocumentChunk.insertMany(chunkDocs);

        const processingTimeMs = Date.now() - startTime;
        await Document.findByIdAndUpdate(documentId, {
          status: 'INDEXED',
          totalChunks: chunkDocs.length,
          totalCharacters: extractedText.length,
          processingTimeMs,
        });

        console.log(
          `✅ [DocuMind Worker] Indexed Document ${documentId} (${chunkDocs.length} chunks) in ${processingTimeMs}ms`
        );
      } catch (error) {
        console.error(`❌ [DocuMind Worker] Ingestion failed for ${documentId}:`, error.message);
        await Document.findByIdAndUpdate(documentId, {
          status: 'FAILED',
          errorMessage: error.message,
        });
      }
    });
  }
}

module.exports = new IngestionService();
