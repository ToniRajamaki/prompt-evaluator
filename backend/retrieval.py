"""Retrieval: embed a query and find the most similar chunks via pgvector."""

from __future__ import annotations

from typing import Any

from pgvector import Vector

import db
from embeddings import embed_query


async def search(
    query: str, document_id: str | None = None, k: int = 6
) -> list[dict[str, Any]]:
    """Return the top-k chunks most similar to the query.

    When `document_id` is given, retrieval is scoped to that document. Results
    include a `score` (1 - cosine distance) and the owning document's name.
    """
    vector = Vector(await embed_query(query))

    # Placeholder order: score(<=>), [document_id], order-by(<=>), limit.
    params: list[Any] = [vector]
    scope = ""
    if document_id:
        scope = "AND c.document_id = %s"
        params.append(document_id)
    params.extend([vector, k])

    rows = db.fetch_all(
        f"""
        SELECT c.id, c.document_id, c.index, c.page, c.text,
               c.start_pos, c.end_pos, c.length, c.highlights,
               d.name AS document_name,
               1 - (c.embedding <=> %s) AS score
        FROM chunks c
        JOIN documents d ON d.id = c.document_id
        WHERE c.embedding IS NOT NULL {scope}
        ORDER BY c.embedding <=> %s
        LIMIT %s
        """,
        tuple(params),
    )
    return rows
