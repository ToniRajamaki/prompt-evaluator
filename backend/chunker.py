"""Backend text chunker.

Mirrors the runtime chunker (`src/notebook/chunker.ts`) and the offline PDF
windower (`scripts/generate_claude_pdf.py`) so chunk shapes stay consistent
across the whole app:

    method: "recursive-character-splitter"
    chunkSize: 280, chunkOverlap: 40

For PDFs we also compute per-page normalized highlight boxes from PyMuPDF word
positions, matching the prebuilt *.chunks.json shape.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

CHUNK_SIZE = 280
CHUNK_OVERLAP = 40
SEPARATORS = ["\n\n", "\n", ". ", " "]


@dataclass
class Chunk:
    id: str
    index: int
    page: int
    start: int
    end: int
    length: int
    text: str
    highlights: list[dict[str, Any]] = field(default_factory=list)


def slugify(file_name: str) -> str:
    base = re.sub(r"\.[^.]+$", "", file_name)
    slug = re.sub(r"[^a-z0-9]+", "-", base, flags=re.IGNORECASE).strip("-")
    return slug.lower() or "doc"


def _window_spans(text: str) -> list[tuple[int, int]]:
    """Greedy character windower with separator-aware boundaries + overlap."""
    spans: list[tuple[int, int]] = []
    pos = 0
    n = len(text)
    while pos < n:
        end = min(n, pos + CHUNK_SIZE)
        if end < n:
            best = -1
            for sep in SEPARATORS:
                i = text.rfind(sep, pos, end)
                if i > pos + CHUNK_SIZE * 0.5:
                    best = max(best, i + len(sep))
            if best > pos:
                end = best
        if text[pos:end].strip():
            spans.append((pos, end))
        if end >= n:
            break
        pos = max(end - CHUNK_OVERLAP, pos + 1)
    return spans


def _round4(x: float) -> float:
    return round(x, 4)


def _merge_line_boxes(boxes: list[dict[str, float]]) -> list[dict[str, float]]:
    """Merge per-word boxes that share a visual text row into one box."""
    boxes = sorted(boxes, key=lambda b: (b["y0"], b["x0"]))
    lines: list[dict[str, float]] = []
    for b in boxes:
        last = lines[-1] if lines else None
        same_line = last is not None and abs(b["y0"] - last["y0"]) <= max(
            b["y1"] - b["y0"], last["y1"] - last["y0"]
        ) * 0.6
        if same_line and last is not None:
            last["x0"] = min(last["x0"], b["x0"])
            last["y0"] = min(last["y0"], b["y0"])
            last["x1"] = max(last["x1"], b["x1"])
            last["y1"] = max(last["y1"], b["y1"])
        else:
            lines.append(dict(b))
    return [
        {
            "x0": _round4(b["x0"]),
            "y0": _round4(b["y0"]),
            "x1": _round4(b["x1"]),
            "y1": _round4(b["y1"]),
        }
        for b in lines
    ]


def chunk_plain_text(file_name: str, full_text: str) -> tuple[list[Chunk], str]:
    """Chunk md/txt content. No highlight boxes (matched live in the UI)."""
    full_text = full_text.strip()
    slug = slugify(file_name)
    spans = _window_spans(full_text)
    chunks: list[Chunk] = []
    for i, (start, end) in enumerate(spans):
        text = " ".join(full_text[start:end].split())
        chunks.append(
            Chunk(
                id=f"{slug}-c{i + 1:02d}",
                index=i,
                page=1,
                start=start,
                end=end,
                length=end - start,
                text=text,
            )
        )
    return chunks, full_text


def chunk_pdf(file_name: str, doc: Any) -> tuple[list[Chunk], str, int]:
    """Chunk a PyMuPDF document, computing normalized per-page highlight boxes.

    Returns (chunks, full_text, page_count).
    """
    slug = slugify(file_name)
    full_text = ""
    words: list[dict[str, Any]] = []
    for pno in range(doc.page_count):
        page = doc[pno]
        pw, ph = page.rect.width, page.rect.height
        raw = page.get_text("words")
        last_block = last_line = None
        for x0, y0, x1, y1, word, block, line, _wn in raw:
            if not word.strip():
                continue
            if last_block is None:
                sep = ""
            elif block != last_block:
                sep = "\n\n"
            elif line != last_line:
                sep = "\n"
            else:
                sep = " "
            full_text += sep
            start = len(full_text)
            full_text += word
            end = len(full_text)
            words.append(
                {
                    "start": start,
                    "end": end,
                    "page": pno + 1,
                    "x0": x0 / pw,
                    "y0": y0 / ph,
                    "x1": x1 / pw,
                    "y1": y1 / ph,
                }
            )
            last_block, last_line = block, line
        full_text += "\n\n"

    full_text = full_text.strip()
    spans = _window_spans(full_text)

    chunks: list[Chunk] = []
    for i, (start, end) in enumerate(spans):
        hit = [w for w in words if w["end"] > start and w["start"] < end]
        by_page: dict[int, list[dict[str, float]]] = {}
        for w in hit:
            by_page.setdefault(w["page"], []).append(w)
        highlights = []
        for page in sorted(by_page):
            highlights.append(
                {"page": page, "boxes": _merge_line_boxes(by_page[page])}
            )
        if not highlights:
            continue
        text = " ".join(full_text[start:end].split())
        chunks.append(
            Chunk(
                id=f"{slug}-c{i + 1:02d}",
                index=i,
                page=highlights[0]["page"],
                start=start,
                end=end,
                length=end - start,
                text=text,
                highlights=highlights,
            )
        )
    return chunks, full_text, doc.page_count
