"""OpenAI embeddings helper.

Wraps the OpenAI embeddings endpoint with simple batching. The model is read
from EMBEDDING_MODEL (default text-embedding-3-small, 1536 dims). The dimension
must match `EMBED_DIM` in db.py.
"""

from __future__ import annotations

import os

from openai import AsyncOpenAI

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
_BATCH = 64

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI()
    return _client


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a list of texts, batching to stay within request limits."""
    if not texts:
        return []
    client = _get_client()
    out: list[list[float]] = []
    for i in range(0, len(texts), _BATCH):
        batch = texts[i : i + _BATCH]
        resp = await client.embeddings.create(model=EMBEDDING_MODEL, input=batch)
        out.extend(item.embedding for item in resp.data)
    return out


async def embed_query(text: str) -> list[float]:
    """Embed a single query string."""
    result = await embed_texts([text])
    return result[0]
