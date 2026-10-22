# documind
A multi-tenant REST API where users upload complex PDFs (contracts, technical manuals, financial reports). The API chunks the text asynchronously, generates vector embeddings, stores them in MongoDB, and exposes a conversational REST endpoint that answers questions with exact page citations.
