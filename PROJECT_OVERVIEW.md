# SourceChat Project Overview

SourceChat is a local "chat with your documents" app. It has a React/Vite frontend and a FastAPI backend. The backend ingests documents, chunks their text, embeds the chunks with OpenAI, stores them in local Postgres with pgvector, and lets an LLM answer questions using retrieved source chunks.

## Main Flow

1. User uploads or selects documents in the frontend.
2. Backend stores uploaded files on disk under `backend/storage/`.
3. Backend extracts text from `pdf`, `md`, or `txt` files.
4. Text is split into small overlapping chunks.
5. Each chunk is embedded with the configured OpenAI embedding model.
6. Chunks, metadata, highlights, and vectors are saved in Postgres.
7. When the user asks a question, the backend embeds the question.
8. pgvector finds the most similar chunks.
9. The PydanticAI agent answers using those chunks and returns citations.
10. The frontend shows the answer, citation pills, and source highlights.

## Runtime Pieces

- `src/notebook/` - active frontend app: sources, viewer, chat panel, citations, highlights.
- `backend/main.py` - FastAPI app, chat endpoints, PydanticAI agent, and agent tool registration.
- `backend/ingest.py` - upload ingestion: save file, extract text, chunk, embed, store.
- `backend/chunker.py` - backend chunking for PDFs, Markdown, and text.
- `backend/embeddings.py` - OpenAI embedding helper.
- `backend/retrieval.py` - query embedding + pgvector similarity search.
- `backend/db.py` - Postgres connection pool, schema setup, vector extension, queries.
- `docker-compose.yml` - local Postgres database using `pgvector/pgvector:pg16`.

## Database

Local Postgres runs from Docker Compose on port `5432`.

It stores two main tables:

- `documents` - one row per uploaded or seeded document, with filename, type, disk path, status, errors, and page count.
- `chunks` - one row per text chunk, with source document id, page, character positions, text, optional PDF highlight boxes, and a `vector(1536)` embedding.

The vector index is an HNSW cosine index on `chunks.embedding`, so retrieval can search by semantic similarity.

## Chunking And Embeddings

Chunking uses a recursive character splitter style:

- chunk size: `280`
- overlap: `40`
- separators: blank lines, new lines, sentence breaks, spaces

For `md` and `txt`, chunks are plain text spans. For PDFs, PyMuPDF extracts words and normalized highlight boxes, so retrieved PDF chunks can be highlighted in the viewer.

Embeddings use `EMBEDDING_MODEL`, defaulting to `text-embedding-3-small`. The DB schema expects 1536-dimensional vectors.

## Agent Tool

The backend creates one cached PydanticAI agent in `get_agent()`.

It registers one tool:

- `search_documents(query: str)` - embeds/searches the user's selected documents and returns relevant excerpts with bracketed citation ids, like `[cats-c01]`.

Request-specific state is passed through `ChatDeps`:

- `document_ids` scopes retrieval to selected documents.
- `collected` stores chunks returned by the tool during that run, so the API can return citations afterward.

So the tool itself is registered once, but each chat request gets its own document scope and citation collection.

## Chat Endpoints

- `POST /api/chat` - normal non-streaming chat response with citations.
- `POST /api/chat/stream` - streams text deltas, then sends a final citations JSON record after a record separator.

Both endpoints require the last message to be from the user. They pass previous messages as model history and pass selected document ids through `ChatDeps`.

## Document Endpoints

- `POST /api/documents` - upload and ingest a document.
- `GET /api/documents` - list documents.
- `GET /api/documents/{id}` - get document metadata.
- `GET /api/documents/{id}/chunks` - get chunk data for the viewer.
- `GET /api/documents/{id}/file` - serve the original file.
- `DELETE /api/documents/{id}` - delete document rows, chunks, and stored file.

## Startup Behavior

On backend startup:

1. `db.init_db()` creates the `vector` extension, tables, and indexes if needed.
2. `db.reset_stuck_documents()` marks interrupted ingestions as errors.
3. If `SEED_DEMO_FILES=true` and `OPENAI_API_KEY` exists, files from `files/` are ingested into the database when the database is empty.

## Commands

```bash
docker compose up -d
cd backend
pip install -r requirements.txt
copy .env.example .env
python -m uvicorn main:app --port 8000 --reload
npm install
npm run dev
```

Useful checks:

```bash
npm run build
npm run lint
```