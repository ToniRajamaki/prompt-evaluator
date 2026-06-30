"""Retrieval: embed a query and find the most similar chunks via pgvector."""

from __future__ import annotations

from typing import Any

from pgvector import Vector

import db
from embeddings import embed_query


async def search(
    query: str,
    document_ids: list[str] | None = None,
    k: int = 6,
    min_score: float | None = None,
) -> list[dict[str, Any]]:
    """Return the top-k chunks most similar to the query.

    When `document_ids` is given, retrieval is scoped to those documents.
    Results include a `score` (1 - cosine distance) and the owning document's
    name. When `min_score` is set, weak matches below that threshold are
    dropped so only relevant excerpts are returned.
    """
    vector = Vector(await embed_query(query))

    # Placeholder order: score(<=>), [document_ids], order-by(<=>), limit.
    params: list[Any] = [vector]
    scope = ""
    if document_ids:
        scope = "AND c.document_id = ANY(%s)"
        params.append(list(document_ids))
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
    if min_score is not None:
        rows = [r for r in rows if float(r["score"]) >= min_score]
    return rows
