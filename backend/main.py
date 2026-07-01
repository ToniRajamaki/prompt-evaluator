"""SourceChat RAG backend (FastAPI + PydanticAI + pgvector).

Provides document ingestion/management plus retrieval-augmented chat:

  - POST   /api/documents            upload + ingest a file
  - GET    /api/documents            list documents (status, chunk counts)
  - GET    /api/documents/{id}       document metadata (for the info menu)
  - GET    /api/documents/{id}/chunks   ChunkSet for the viewer
  - GET    /api/documents/{id}/file  serve the raw file bytes
  - DELETE /api/documents/{id}       remove a document + its chunks
  - POST   /api/chat                 RAG chat, returns reply + citations
  - POST   /api/chat/stream          streaming RAG chat (text deltas)

The OpenAI key/model and DB connection are read from the environment
(see .env.example).
"""

from __future__ import annotations

import json
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from pydantic_ai import Agent, RunContext
from pydantic_ai.messages import (
    ModelMessage,
    ModelRequest,
    ModelResponse,
    TextPart,
    UserPromptPart,
)

import db
import ingest
import retrieval
from chunker import CHUNK_OVERLAP, CHUNK_SIZE, SEPARATORS

load_dotenv()

MODEL = os.getenv("OPENAI_MODEL", "openai:gpt-4o-mini")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
SEED_DEMO_FILES = os.getenv("SEED_DEMO_FILES", "true").lower() in ("1", "true", "yes")
FILES_DIR = Path(__file__).resolve().parent.parent / "files"

# Minimum cosine similarity (1 - distance) for a chunk to count as relevant.
# Weak matches below this are dropped so citations stay on-topic.
RETRIEVAL_MIN_SCORE = float(os.getenv("RETRIEVAL_MIN_SCORE", "0.15"))
RETRIEVAL_K = int(os.getenv("RETRIEVAL_K", "6"))

SYSTEM_PROMPT = os.getenv(
    "SYSTEM_PROMPT",
    "You are a research assistant inside a document notebook app. The user has "
    "hand-picked a set of source documents and put them in your context, and "
    "your PRIMARY JOB is to answer from those sources — not from your own prior "
    "knowledge.\n"
    "\n"
    "How to answer:\n"
    "1. For ANY question that could be answered from the documents (facts, "
    "definitions, explanations, summaries, comparisons, 'what does it say "
    "about...'), you MUST call the `search_documents` tool BEFORE answering. Do "
    "not answer such questions from memory.\n"
    "2. Search thoughtfully: use the user's wording, then run additional "
    "searches with reworded or narrower queries if the first results are thin, "
    "partial, or off-target. Prefer 2-3 focused searches over one vague one.\n"
    "3. Ground your answer in the returned excerpts. Prefer what the sources "
    "actually say over what you already know, and reflect their specific "
    "wording, facts, and framing.\n"
    "4. Whenever ANY returned excerpt is relevant, you MUST use it and cite it "
    "inline with its exact bracketed id, e.g. [cats-c01]. Copy the id exactly "
    "as returned. Every claim drawn from the sources needs a citation, and only "
    "cite ids that a search actually returned — never invent one.\n"
    "5. Don't refuse just because the wording differs or the match is partial. "
    "If the excerpts cover part of the question, answer that part from them "
    "(with citations) and briefly note what the sources don't address. Reserve "
    "'the documents don't cover this' for when a search returns nothing "
    "relevant at all.\n"
    "6. Only when searches return nothing relevant may you say the selected "
    "documents don't cover the question and then, if helpful, add general "
    "knowledge — clearly labelled as your own knowledge, not from the sources, "
    "and without citations.\n"
    "\n"
    "You do NOT need to search for greetings, small talk, clarifying questions, "
    "or questions purely about this conversation. Use judgement — but when in "
    "doubt about whether the documents are relevant, search first.",
)


@dataclass
class ChatDeps:
    """Per-request retrieval context for the agent's search tool."""

    document_ids: list[str] | None
    collected: list[dict] = field(default_factory=list)


agent: Agent[ChatDeps, str] | None = None


def get_agent() -> Agent[ChatDeps, str]:
    global agent
    if agent is None:
        agent = Agent(MODEL, deps_type=ChatDeps, system_prompt=SYSTEM_PROMPT)

        @agent.tool
        async def search_documents(ctx: RunContext[ChatDeps], query: str) -> str:
            """Semantic-search the user's in-context documents.

            Returns the most relevant source excerpts, each prefixed with a
            bracketed id to cite. Scoped to the documents the user selected.
            """
            hits = await retrieval.search(
                query,
                document_ids=ctx.deps.document_ids,
                k=RETRIEVAL_K,
                min_score=RETRIEVAL_MIN_SCORE,
            )
            _collect_hits(ctx.deps, hits)
            if not hits:
                return "No relevant excerpts were found in the selected sources."
            return _build_context(hits)

    return agent


@asynccontextmanager
async def lifespan(_app: FastAPI):
    db.init_db()
    db.reset_stuck_documents()
    if SEED_DEMO_FILES and os.getenv("OPENAI_API_KEY"):
        try:
            await ingest.seed_demo_files(FILES_DIR)
        except Exception as exc:  # noqa: BLE001 - seeding is best-effort
            print(f"[seed] skipped demo seeding: {exc}")
    yield
    db.close_pool()


app = FastAPI(title="SourceChat RAG backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Models ----------------------------------------------------------------


class Message(BaseModel):
    role: str  # "user" | "assistant"
    text: str


class ChatRequest(BaseModel):
    messages: list[Message]
    # The documents checked into context. `documentId` is kept for backward
    # compatibility (single open-document fallback).
    documentIds: list[str] | None = None
    documentId: str | None = None


class CitationOut(BaseModel):
    id: str
    chunkId: str
    fileName: str
    page: int
    snippet: str
    score: float


class ChatResponse(BaseModel):
    reply: str
    citations: list[CitationOut]


# --- Helpers ---------------------------------------------------------------


def _to_history(messages: list[Message]) -> list[ModelMessage]:
    history: list[ModelMessage] = []
    for msg in messages:
        if msg.role == "user":
            history.append(ModelRequest(parts=[UserPromptPart(content=msg.text)]))
        else:
            history.append(ModelResponse(parts=[TextPart(content=msg.text)]))
    return history


def _snippet(text: str, max_len: int = 90) -> str:
    clean = " ".join(text.split())
    return clean if len(clean) <= max_len else clean[:max_len].rstrip() + "…"


def _build_context(hits: list[dict]) -> str:
    blocks = []
    for h in hits:
        blocks.append(f"[{h['id']}] (from {h['document_name']})\n{h['text']}")
    return "\n\n".join(blocks)


def _collect_hits(deps: ChatDeps, hits: list[dict]) -> None:
    """Accumulate chunks returned by the search tool, de-duped by chunk id."""
    seen = {h["id"] for h in deps.collected}
    for h in hits:
        if h["id"] not in seen:
            deps.collected.append(h)
            seen.add(h["id"])


def _resolve_document_ids(req: ChatRequest) -> list[str] | None:
    """Context document ids, falling back to the single open document."""
    if req.documentIds:
        return req.documentIds
    if req.documentId:
        return [req.documentId]
    return None


def _citations(hits: list[dict]) -> list[CitationOut]:
    return [
        CitationOut(
            id=h["id"],
            chunkId=h["id"],
            fileName=h["document_name"],
            page=h.get("page") or 1,
            snippet=_snippet(h["text"]),
            score=round(float(h["score"]), 4),
        )
        for h in hits
    ]


def _require_openai() -> None:
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(500, "OPENAI_API_KEY is not set. Fill in backend/.env")


# --- Document endpoints ----------------------------------------------------


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model": MODEL, "embeddingModel": EMBEDDING_MODEL}


@app.get("/api/documents")
def list_documents() -> list[dict]:
    return db.fetch_all(
        """
        SELECT d.id, d.name, d.kind, d.page_count, d.status, d.error,
               d.created_at,
               COALESCE(c.n, 0) AS chunk_count,
               COALESCE(c.vectorized, 0) AS vectorized_count
        FROM documents d
        LEFT JOIN (
            SELECT document_id,
                   count(*) AS n,
                   count(embedding) AS vectorized
            FROM chunks GROUP BY document_id
        ) c ON c.document_id = d.id
        ORDER BY d.created_at
        """
    )


@app.post("/api/documents")
async def upload_document(file: UploadFile) -> dict:
    _require_openai()
    name = file.filename or "upload"
    if ingest.kind_from_name(name) is None:
        raise HTTPException(400, f"Unsupported file type: {name}")
    data = await file.read()
    try:
        doc_id = await ingest.ingest_upload(name, data)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(500, f"Ingestion failed: {exc}") from exc
    doc = db.fetch_one("SELECT * FROM documents WHERE id=%s", (doc_id,))
    return doc or {"id": doc_id}


@app.get("/api/documents/{doc_id}")
def get_document(doc_id: str) -> dict:
    doc = db.fetch_one(
        """
        SELECT d.*, COALESCE(c.n, 0) AS chunk_count,
               COALESCE(c.vectorized, 0) AS vectorized_count
        FROM documents d
        LEFT JOIN (
            SELECT document_id, count(*) AS n, count(embedding) AS vectorized
            FROM chunks GROUP BY document_id
        ) c ON c.document_id = d.id
        WHERE d.id = %s
        """,
        (doc_id,),
    )
    if doc is None:
        raise HTTPException(404, "Document not found")
    doc["embeddingModel"] = EMBEDDING_MODEL
    return doc


@app.get("/api/documents/{doc_id}/chunks")
def get_document_chunks(doc_id: str) -> dict:
    doc = db.fetch_one(
        "SELECT name, kind, page_count FROM documents WHERE id=%s", (doc_id,)
    )
    if doc is None:
        raise HTTPException(404, "Document not found")
    rows = db.fetch_all(
        """
        SELECT id, index, page, start_pos, end_pos, length, text, highlights
        FROM chunks WHERE document_id=%s ORDER BY index
        """,
        (doc_id,),
    )
    chunks = []
    for r in rows:
        highlights = r["highlights"]
        if isinstance(highlights, str):
            highlights = json.loads(highlights)
        chunk = {
            "id": r["id"],
            "index": r["index"],
            "start": r["start_pos"],
            "end": r["end_pos"],
            "length": r["length"],
            "text": r["text"],
            "page": r["page"],
        }
        if highlights:
            chunk["highlights"] = highlights
        chunks.append(chunk)
    method = (
        "pymupdf-text-positions"
        if doc["kind"] == "pdf"
        else "recursive-character-splitter"
    )
    return {
        "source": doc["name"],
        "page": 1,
        "method": method,
        "params": {
            "chunkSize": CHUNK_SIZE,
            "chunkOverlap": CHUNK_OVERLAP,
            "separators": SEPARATORS,
        },
        "chunks": chunks,
        "fullText": "",
    }


@app.get("/api/documents/{doc_id}/file")
def get_document_file(doc_id: str) -> FileResponse:
    doc = db.fetch_one("SELECT name, path FROM documents WHERE id=%s", (doc_id,))
    if doc is None or not doc.get("path"):
        raise HTTPException(404, "Document not found")
    path = Path(doc["path"])
    if not path.exists():
        raise HTTPException(404, "File missing on disk")
    return FileResponse(path, filename=doc["name"])


@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: str) -> dict:
    removed = ingest.delete_document(doc_id)
    if removed is None:
        raise HTTPException(404, "Document not found")
    return {"deleted": doc_id}


# --- Chat endpoints --------------------------------------------------------


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    _require_openai()
    if not req.messages or req.messages[-1].role != "user":
        raise HTTPException(400, "Last message must be from the user.")

    question = req.messages[-1].text
    history = _to_history(req.messages[:-1])
    deps = ChatDeps(document_ids=_resolve_document_ids(req))

    try:
        result = await get_agent().run(
            question, message_history=history, deps=deps
        )
    except Exception as exc:
        raise HTTPException(502, f"Model error: {exc}") from exc

    return ChatResponse(reply=result.output, citations=_citations(deps.collected))


@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest) -> StreamingResponse:
    """Stream the reply as text deltas, then a trailing citations record.

    The body is plain text deltas, then a final record separator (\\x1e)
    followed by a JSON object: {"citations": [...]}. The frontend splits on
    \\x1e to recover the citations after the text. Citations are the chunks the
    agent's search tool actually returned during the run.
    """
    _require_openai()
    if not req.messages or req.messages[-1].role != "user":
        raise HTTPException(400, "Last message must be from the user.")

    question = req.messages[-1].text
    history = _to_history(req.messages[:-1])
    deps = ChatDeps(document_ids=_resolve_document_ids(req))

    async def gen() -> AsyncIterator[str]:
        try:
            async with get_agent().run_stream(
                question, message_history=history, deps=deps
            ) as result:
                async for delta in result.stream_text(delta=True):
                    yield delta
        except Exception as exc:
            yield f"\n\n[stream error: {exc}]"
        citations = [c.model_dump() for c in _citations(deps.collected)]
        yield "\x1e" + json.dumps({"citations": citations})

    return StreamingResponse(gen(), media_type="text/plain; charset=utf-8")
