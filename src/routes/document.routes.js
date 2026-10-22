const express = require('express');
const router = express.Router();
const documentController = require('../controllers/document.controller');
const upload = require('../middlewares/upload.middleware');

// Ingest via multipart file upload OR raw JSON text
router.post('/upload', upload.single('file'), documentController.ingestDocument);

// List all documents & check indexing status
router.get('/', documentController.listDocuments);
router.get('/:id', documentController.getDocumentStatus);

// Conversational RAG Endpoints (Standard JSON & SSE Streaming)
router.post('/:id/ask', documentController.askDocument);
router.post('/:id/ask-stream', documentController.askDocumentStream);

// Cascade Delete Document + Vector Chunks
router.delete('/:id', documentController.deleteDocument);

module.exports = router;
