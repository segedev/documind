const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'DocuMind: Asynchronous RAG Document Intelligence API',
    version: '1.0.0',
    description:
      'Non-blocking Node.js & MongoDB RAG Engine with Hybrid Search (Vector + Keyword Fusion) and Server-Sent Events (SSE) token streaming.',
  },
  servers: [{ url: '/', description: 'Current Server' }],
  paths: {
    '/api/v1/documents/upload': {
      post: {
        summary: '1. Ingest Document Asynchronously (Returns 202 Accepted)',
        tags: ['Document Ingestion'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', example: 'Ardent Universe Engineering Handbook' },
                  text: {
                    type: 'string',
                    example:
                      'Ardent Universe utilizes microservices built on Node.js and MongoDB. All production REST APIs must enforce strict schema validation using Zod, maintain 99.9% uptime, and implement asynchronous worker queues for heavy I/O operations such as PDF parsing and vector embedding generation.',
                  },
                },
              },
            },
          },
        },
        responses: { 202: { description: 'Accepted for background vector indexing' } },
      },
    },
    '/api/v1/documents': {
      get: {
        summary: '2. List All Documents & Indexing Status',
        tags: ['Document Management'],
        responses: { 200: { description: 'List of documents' } },
      },
    },
    '/api/v1/documents/{id}/ask': {
      post: {
        summary: '3. Ask Grounded Question (Hybrid Vector + Keyword Search)',
        tags: ['RAG Querying'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Document ObjectId',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  question: {
                    type: 'string',
                    example: 'What are the requirements for production REST APIs at Ardent Universe?',
                  },
                  topK: { type: 'number', example: 3 },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Grounded answer with exact chunk citations' } },
      },
    },
    '/api/v1/documents/{id}/ask-stream': {
      post: {
        summary: '4. Stream Grounded Answer via Server-Sent Events (SSE)',
        tags: ['RAG Querying'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  question: {
                    type: 'string',
                    example: 'How does Ardent Universe handle heavy I/O operations?',
                  },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'SSE token stream' } },
      },
    },
  },
};

module.exports = swaggerDocument;
