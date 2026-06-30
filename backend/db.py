"""Database access for the SourceChat RAG backend.

Thin layer over psycopg (v3) + pgvector. Holds a small connection pool, creates
the schema idempotently on startup, and exposes the document/chunk queries used
by ingestion and retrieval.

Schema
------
documents
    id           uuid primary key
    name         text                 -- original filename
    kind         text                 -- 'pdf' | 'md' | 'txt'
    path         text                 -- storage path relative to STORAGE_DIR
    page_count   int
    status       text                 -- 'pending'|'processing'|'ready'|'error'
    error        text                 -- populated when status='error'
    created_at   timestamptz

chunks
    id           text primary key     -- e.g. "varastotilat-c01"
    document_id  uuid references documents
    index        int
    page         int
    start_pos    int
    end_pos      int
    length       int
    text         text
    highlights   jsonb                -- ChunkHighlight[] (normalized boxes)
    embedding    vector(EMBED_DIM)
"""

from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Any, Iterator

import psycopg
import psycopg.rows
from pgvector.psycopg import register_vector
from psycopg_pool import ConnectionPool

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://sourcechat:sourcechat@localhost:5432/sourcechat",
)

# Dimension for text-embedding-3-small / -large(1536 truncation). Keep in sync
# with EMBEDDING_MODEL in the environment.
EMBED_DIM = 1536

_pool: ConnectionPool | None = None


def _configure(conn: psycopg.Connection) -> None:
    register_vector(conn)


def get_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            DATABASE_URL,
            min_size=1,
            max_size=5,
            configure=_configure,
            open=True,
        )
    return _pool


@contextmanager
def get_conn() -> Iterator[psycopg.Connection]:
    pool = get_pool()
    with pool.connection() as conn:
        yield conn


SCHEMA_SQL = f"""
CREATE TABLE IF NOT EXISTS documents (
    id          uuid PRIMARY KEY,
    name        text NOT NULL,
    kind        text NOT NULL,
    path        text,
    page_count  int NOT NULL DEFAULT 0,
    status      text NOT NULL DEFAULT 'pending',
    error       text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chunks (
    id           text PRIMARY KEY,
    document_id  uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    index        int NOT NULL,
    page         int NOT NULL DEFAULT 1,
    start_pos    int NOT NULL DEFAULT 0,
    end_pos      int NOT NULL DEFAULT 0,
    length       int NOT NULL DEFAULT 0,
    text         text NOT NULL,
    highlights   jsonb,
    embedding    vector({EMBED_DIM})
);

CREATE INDEX IF NOT EXISTS chunks_document_id_idx ON chunks(document_id);
CREATE INDEX IF NOT EXISTS chunks_embedding_idx
    ON chunks USING hnsw (embedding vector_cosine_ops);
"""


def init_db() -> None:
    """Create the extension, tables and indexes if they don't exist.

    Uses a standalone connection so the `vector` extension exists *before* the
    pooled connections (whose `configure` registers the vector type) are opened.
    Otherwise a fresh database fails with "vector type not found".
    """
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
        conn.execute(SCHEMA_SQL)


def reset_stuck_documents() -> None:
    """Mark any documents left mid-ingestion (e.g. a crash) as errored."""
    with get_conn() as conn:
        conn.execute(
            "UPDATE documents SET status='error', error='ingestion interrupted' "
            "WHERE status IN ('pending','processing')"
        )
        conn.commit()


def fetch_all(query: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    with get_conn() as conn:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute(query, params)
            return cur.fetchall()


def fetch_one(query: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
    with get_conn() as conn:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute(query, params)
            return cur.fetchone()


def execute(query: str, params: tuple[Any, ...] = ()) -> None:
    with get_conn() as conn:
        conn.execute(query, params)
        conn.commit()


def close_pool() -> None:
    """Close the connection pool (call on server shutdown)."""
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None
