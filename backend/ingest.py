"""Document ingestion pipeline.

Given an uploaded file: persist bytes to disk, extract text (+ highlight boxes
for PDFs), chunk, embed, and store the document and its chunks in Postgres.

Status lifecycle: pending -> processing -> ready | error.
"""

from __future__ import annotations

import json
import os
import uuid
from pathlib import Path

import fitz  # PyMuPDF
import psycopg

import db
from chunker import Chunk, chunk_pdf, chunk_plain_text
from embeddings import embed_texts

STORAGE_DIR = Path(os.getenv("STORAGE_DIR", "storage"))

KINDS = {"pdf", "md", "txt"}


def kind_from_name(name: str) -> str | None:
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    return ext if ext in KINDS else None


def _storage_path(doc_id: str, name: str) -> Path:
    safe = name.replace("/", "_").replace("\\", "_")
    return STORAGE_DIR / f"{doc_id}__{safe}"


def save_bytes(doc_id: str, name: str, data: bytes) -> Path:
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    path = _storage_path(doc_id, name)
    path.write_bytes(data)
    return path


def create_document(doc_id: str, name: str, kind: str, path: str) -> None:
    db.execute(
        "INSERT INTO documents (id, name, kind, path, status) "
        "VALUES (%s, %s, %s, %s, 'pending')",
        (doc_id, name, kind, path),
    )


def _set_status(doc_id: str, status: str, error: str | None = None) -> None:
    db.execute(
        "UPDATE documents SET status=%s, error=%s WHERE id=%s",
        (status, error, doc_id),
    )


def _extract(name: str, kind: str, data: bytes) -> tuple[list[Chunk], str, int]:
    if kind == "pdf":
        doc = fitz.open(stream=data, filetype="pdf")
        try:
            chunks, full_text, pages = chunk_pdf(name, doc)
        finally:
            doc.close()
        return chunks, full_text, pages
    text = data.decode("utf-8", errors="replace")
    chunks, full_text = chunk_plain_text(name, text)
    return chunks, full_text, 1


def _store_chunks(
    doc_id: str, chunks: list[Chunk], vectors: list[list[float]]
) -> None:
    with db.get_conn() as conn:
        with conn.cursor() as cur:
            for chunk, vec in zip(chunks, vectors):
                cur.execute(
                    "INSERT INTO chunks "
                    "(id, document_id, index, page, start_pos, end_pos, "
                    " length, text, highlights, embedding) "
                    "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) "
                    "ON CONFLICT (id) DO UPDATE SET "
                    "  text=EXCLUDED.text, highlights=EXCLUDED.highlights, "
                    "  embedding=EXCLUDED.embedding",
                    (
                        chunk.id,
                        doc_id,
                        chunk.index,
                        chunk.page,
                        chunk.start,
                        chunk.end,
                        chunk.length,
                        chunk.text,
                        json.dumps(chunk.highlights) if chunk.highlights else None,
                        vec,
                    ),
                )
        conn.commit()


async def ingest(doc_id: str, name: str, kind: str, data: bytes) -> None:
    """Run the full pipeline for an already-created (pending) document."""
    _set_status(doc_id, "processing")
    try:
        chunks, _full_text, pages = _extract(name, kind, data)
        if not chunks:
            raise ValueError("no extractable text found in document")
        vectors = await embed_texts([c.text for c in chunks])
        _store_chunks(doc_id, chunks, vectors)
        db.execute(
            "UPDATE documents SET status='ready', error=NULL, page_count=%s "
            "WHERE id=%s",
            (pages, doc_id),
        )
    except Exception as exc:  # noqa: BLE001 - record any failure on the document
        _set_status(doc_id, "error", str(exc))
        raise


async def ingest_upload(name: str, data: bytes) -> str:
    """Entry point for an HTTP upload. Returns the new document id."""
    kind = kind_from_name(name)
    if kind is None:
        raise ValueError(f"unsupported file type: {name}")
    doc_id = str(uuid.uuid4())
    path = save_bytes(doc_id, name, data)
    create_document(doc_id, name, kind, str(path))
    await ingest(doc_id, name, kind, data)
    return doc_id


def delete_document(doc_id: str) -> dict | None:
    row = db.fetch_one("SELECT path FROM documents WHERE id=%s", (doc_id,))
    if row is None:
        return None
    db.execute("DELETE FROM documents WHERE id=%s", (doc_id,))
    path = row.get("path")
    if path:
        try:
            Path(path).unlink(missing_ok=True)
        except OSError:
            pass
    return row


async def seed_demo_files(files_dir: Path) -> None:
    """On first run, ingest the static demo files from ../files into the DB."""
    existing = db.fetch_one("SELECT count(*) AS n FROM documents")
    if existing and existing["n"] > 0:
        return
    if not files_dir.exists():
        return
    for path in sorted(files_dir.iterdir()):
        if not path.is_file():
            continue
        kind = kind_from_name(path.name)
        if kind is None:
            continue
        try:
            data = path.read_bytes()
            doc_id = str(uuid.uuid4())
            stored = save_bytes(doc_id, path.name, data)
            create_document(doc_id, path.name, kind, str(stored))
            await ingest(doc_id, path.name, kind, data)
        except (OSError, ValueError, psycopg.Error):
            # Best-effort seeding; skip anything that fails (e.g. bad PDF).
            continue
