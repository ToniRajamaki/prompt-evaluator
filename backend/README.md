# RAG backend (FastAPI + Postgres/pgvector)

FastAPI server that powers SourceChat: it ingests documents (PDF/Markdown/text),
chunks and embeds them with OpenAI, stores vectors in Postgres + pgvector, and
answers questions with retrieval-augmented generation (PydanticAI) including
citations back to the source chunks.

## Architecture

```
upload ─▶ ingest.py ─▶ chunker.py ─▶ embeddings.py ─▶ Postgres (pgvector)
                                                            │
question ─▶ retrieval.py (cosine search) ──────────────────┘
                                                            ▼
                                           main.py /chat → grounded answer + citations
```

- `db.py` — psycopg3 connection pool, schema, `init_db()` (creates the `vector`
  extension + tables).
- `chunker.py` — char-window chunker mirroring the frontend (`chunker.ts`) and
  `scripts/generate_claude_pdf.py`; PDFs get normalized highlight boxes via PyMuPDF.
- `embeddings.py` — batched OpenAI embeddings (`text-embedding-3-small`, 1536 dims).
- `ingest.py` — store → extract → chunk → embed → persist; `documents.status`
  moves `pending → processing → ready/error`.
- `retrieval.py` — embeds the query and runs `ORDER BY embedding <=> $1`.
- `main.py` — document CRUD + RAG chat endpoints.

## Setup

1. Start Postgres + pgvector (from the repo root):

   ```bash
   docker compose up -d
   ```

2. Install deps and configure env:

   ```bash
   cd backend
   pip install -r requirements.txt
   cp .env.example .env   # then set a real OPENAI_API_KEY
   ```

   Key env vars (see `.env.example`): `OPENAI_API_KEY`, `OPENAI_MODEL`,
   `EMBEDDING_MODEL`, `DATABASE_URL`, `STORAGE_DIR`, `SEED_DEMO_FILES`.

## Run

```bash
python -m uvicorn main:app --port 8000 --reload
```

On startup the server runs `init_db()` and, when `SEED_DEMO_FILES=true` and the
DB is empty, ingests the demo documents from `../files`.

The frontend talks to `http://localhost:8000` by default. Override with
`VITE_API_URL` (see `../.env.example`).

## Endpoints

- `GET  /api/health` — status + active chat/embedding models
- `GET  /api/documents` — list documents with status + chunk/vector counts
- `GET  /api/documents/{id}` — single document metadata
- `GET  /api/documents/{id}/chunks` — chunks in the viewer's `ChunkSet` shape
- `GET  /api/documents/{id}/file` — serve the raw stored file
- `POST /api/documents` — multipart upload (`file`); ingests and returns metadata
- `DELETE /api/documents/{id}` — delete a document, its chunks, and its file
- `POST /api/chat` — body `{ "messages": [{ "role", "text" }], "documentId"? }`,
  retrieves context and returns `{ "reply", "citations": [...] }`
- `POST /api/chat/stream` — same body; streams plain-text deltas, then a `\x1e`
  (record separator) followed by a `{"citations":[...]}` JSON trailer. The chat
  panel uses this for the live typewriter effect and citation highlights.
