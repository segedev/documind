const { z } = require('zod');
const Document = require('../models/Document.model');
const DocumentChunk = require('../models/DocumentChunk.model');
const ingestionService = require('../services/ingestion.service');
const retrievalService = require('../services/retrieval.service');
const aiService = require('../services/ai.service');

const textIngestSchema = z.object({
  title: z.string().min(2, 'Document title is required'),
  text: z.string().min(20, 'Document text must be at least 20 characters'),
});

const askSchema = z.object({
  question: z.string().min(3, 'Question must be at least 3 characters'),
  topK: z.number().int().min(1).max(10).optional().default(3),
});


exports.ingestDocument = async (req, res, next) => {
  try {
    let title = req.body.title || (req.file ? req.file.originalname : 'Untitled Document');
    let mimeType = req.file ? req.file.mimetype : 'text/plain';
    let originalFilename = req.file ? req.file.originalname : 'raw_text_input.txt';
    let rawText = req.body.text || '';

    if (!req.file && !rawText) {
      const parsed = textIngestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'Provide either a file upload (multipart/form-data) or a JSON { title, text } body.',
        });
      }
    }

    const doc = await Document.create({
      title,
      originalFilename,
      mimeType,
      status: 'QUEUED',
    });

    // Trigger non-blocking background ingestion worker
    ingestionService.enqueueDocumentIngestion(
      doc._id,
      req.file ? req.file.buffer : null,
      mimeType,
      rawText
    );

    return res.status(202).json({
      success: true,
      message: 'Document accepted for asynchronous background indexing.',
      data: {
        documentId: doc._id,
        title: doc.title,
        status: doc.status,
        statusCheckEndpoint: `/api/v1/documents/${doc._id}`,
      },
    });
  } catch (error) {
    next(error);
  }
};


exports.listDocuments = async (req, res, next) => {
  try {
    const docs = await Document.find().sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, count: docs.length, data: docs });
  } catch (error) {
    next(error);
  }
};


exports.getDocumentStatus = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id).lean();
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    res.status(200).json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
};


exports.askDocument = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const parsed = askSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.issues });
    }

    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    if (doc.status !== 'INDEXED') {
      return res.status(409).json({
        success: false,
        error: `Document is currently ${doc.status}. Please wait until status is INDEXED.`,
      });
    }

    const { question, topK } = parsed.data;
    const retrievedChunks = await retrievalService.hybridSearch(doc._id, question, topK);
    const answer = await aiService.generateGroundedAnswer(question, retrievedChunks);

    res.status(200).json({
      success: true,
      data: {
        documentId: doc._id,
        documentTitle: doc.title,
        question,
        answer,
        citations: retrievedChunks,
        latencyMs: Date.now() - startTime,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/documents/:id/ask-stream
 * Server-Sent Events (SSE) Endpoint: Streams citations and tokens in real time.
 */
exports.askDocumentStream = async (req, res, next) => {
  try {
    const parsed = askSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.issues });
    }

    const doc = await Document.findById(req.params.id);
    if (!doc || doc.status !== 'INDEXED') {
      return res.status(400).json({
        success: false,
        error: 'Document not found or not yet INDEXED.',
      });
    }

    // Set SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const { question, topK } = parsed.data;
    const retrievedChunks = await retrievalService.hybridSearch(doc._id, question, topK);

    // Emit citations event first
    res.write(`event: citations\ndata: ${JSON.stringify(retrievedChunks)}\n\n`);

    const fullAnswer = await aiService.generateGroundedAnswer(question, retrievedChunks);
    const tokens = fullAnswer.split(' ');

    // Stream token-by-token
    for (const token of tokens) {
      res.write(`event: token\ndata: ${JSON.stringify({ token: token + ' ' })}\n\n`);
      await new Promise((r) => setTimeout(r, 35));
    }

    res.write(`event: done\ndata: ${JSON.stringify({ completed: true })}\n\n`);
    res.end();
  } catch (error) {
    next(error);
  }
};


exports.deleteDocument = async (req, res, next) => {
  try {
    const doc = await Document.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    const deletedChunks = await DocumentChunk.deleteMany({ documentId: doc._id });

    res.status(200).json({
      success: true,
      message: 'Document and associated vector chunks purged.',
      purgedChunksCount: deletedChunks.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};
