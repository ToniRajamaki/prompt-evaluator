"""
Generate a text-layer "claude stuff.pdf" and its chunk highlight data using
PyMuPDF (no OCR). The original file was a scanned image PDF with no text layer,
so neither pdfjs nor PyMuPDF could extract text/positions from it. We rebuild it
as a real text PDF, then use PyMuPDF's word-level bounding boxes to store
normalized highlight boxes per chunk:

    box = { x0, y0, x1, y1 }   # all in 0..1, relative to the page

Runtime simply scales these boxes to the rendered page size.

Run:  python scripts/generate_claude_pdf.py
"""

import json
import fitz  # PyMuPDF

PDF_OUT = "files/claude stuff.pdf"
JSON_OUT = "src/notebook/data/claude-stuff.chunks.json"
SOURCE_NAME = "claude stuff.pdf"

PAGE_W, PAGE_H = 612, 792  # US Letter, matches the rest of the demo
CHUNK_SIZE = 280
CHUNK_OVERLAP = 40
SEPARATORS = ["\n\n", "\n", ". ", " "]

# --- Article content (fictional test fixture) ------------------------------
HTML = """
<h1>Claude Fable 5 and Claude Mythos 5</h1>
<p class="meta">Announcements &middot; Jun 9, 2026</p>

<p>Today we are launching Claude Fable 5: a Mythos-class model that we have made
safe for general use. Fable 5's capabilities exceed those of any model we have
ever made generally available.</p>

<p>It is state-of-the-art on nearly all tested benchmarks of AI capability,
showing exceptional performance in software engineering, knowledge work, vision,
and scientific research. The longer and more complex the task, the larger Fable
5's lead over our other models.</p>

<p>Releasing a model this capable comes with risks. Without safeguards, Fable 5's
capabilities in areas like cybersecurity could be misused to cause serious
damage. We have therefore launched the model with safeguards that mean queries on
some topics will instead receive a response from our next-most-capable model,
Claude Opus 4.8.</p>

<p>To release the model both safely and quickly, we have tuned these safeguards
conservatively. They will sometimes catch harmless requests, though they trigger,
on average, in less than five percent of sessions. With more capable models
arriving in the coming months, we are working to improve our safeguards and
reduce false positives as quickly as we can.</p>

<h2>Claude Mythos 5</h2>

<p>For a small group of cyberdefenders and infrastructure providers, we are also
launching Claude Mythos 5. It is the same underlying model as Fable 5, but with
the safeguards lifted in some areas.</p>

<p>Mythos 5 will initially be deployed through Project Glasswing, in
collaboration with the US government, as an upgrade to Claude Mythos Preview. It
has the strongest cybersecurity capabilities of any model in the world. Soon, we
intend to expand access to Mythos 5 through a broader trusted access program.</p>

<p>The capabilities of models like Fable 5 and Mythos 5 have the potential to do
profound good for the world. We have seen the beginnings of this in Project
Glasswing, where the models have helped cyber defenders secure critically
important software. We have also seen it in life sciences research, where the
models are positing novel hypotheses and speeding up the development of new
therapeutics.</p>

<p>Fable 5 and Mythos 5 are offered at ten dollars per million input tokens and
fifty dollars per million output tokens, less than half the price of Claude
Mythos Preview. Today's joint launch is another step towards our goal of bringing
advanced AI capabilities to as many users as possible, as quickly and as safely
as we can.</p>

<h2>Claude Fable 5's new safeguards</h2>

<p>Mythos-class models have reached a threshold where they present significant
risks. In April we began Project Glasswing, releasing the first Mythos-class
model to a limited group of cyber defenders and critical software infrastructure
providers. When we did so, we stated that we hoped to eventually release
Mythos-level capabilities to all our users, so long as we had developed new
safeguards strong enough to reliably prevent misuse.</p>

<p>Over the past few months we have been improving these safeguards, and they are
now robust enough for a general release. Because we have prioritized safety, we
have deliberately tuned the safeguards to be cautious, and they are still
stricter than would be ideal. We recognize that this will be frustrating to some
users, and our aim is to reduce false positives as we update and refine the
safeguards after launch.</p>

<p>New safeguards are cautious by design. Some benign requests will trigger
classifiers, while false positives are reduced over time. Distillation attempts
to extract Claude capabilities for competing models are flagged by the
safeguards, and a new data-retention policy requires thirty-day retention for
Mythos-class traffic across first- and third-party surfaces.</p>

<p>Fable 5 is broadly available, while Mythos 5 is restricted to trusted partners
and selected biology researchers. Mythos-class models sit above the Opus class,
with Claude Mythos Preview released through Project Glasswing.</p>
"""

CSS = """
h1 { font-size: 22px; margin: 0 0 4px 0; }
h2 { font-size: 16px; margin: 18px 0 6px 0; }
p { font-size: 11px; line-height: 1.5; margin: 0 0 10px 0; }
p.meta { color: #666; font-size: 10px; margin-bottom: 16px; }
"""


def build_pdf() -> None:
    story = fitz.Story(html=HTML, user_css=CSS)
    writer = fitz.DocumentWriter(PDF_OUT)
    mediabox = fitz.Rect(0, 0, PAGE_W, PAGE_H)
    where = mediabox + (56, 56, -56, -56)  # 56pt margins
    more = True
    while more:
        dev = writer.begin_page(mediabox)
        more, _ = story.place(where)
        story.draw(dev)
        writer.end_page()
    writer.close()


def window_chunks(text: str):
    """Greedy character windower with separator-aware boundaries + overlap,
    mirroring the runtime chunker and the varastotilat dataset."""
    spans = []
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


def round4(x: float) -> float:
    return round(x, 4)


def merge_line_boxes(boxes):
    """Merge per-word boxes that share a visual text row into one box."""
    boxes = sorted(boxes, key=lambda b: (b["y0"], b["x0"]))
    lines = []
    for b in boxes:
        last = lines[-1] if lines else None
        same_line = last is not None and abs(b["y0"] - last["y0"]) <= max(
            b["y1"] - b["y0"], last["y1"] - last["y0"]
        ) * 0.6
        if same_line:
            last["x0"] = min(last["x0"], b["x0"])
            last["y0"] = min(last["y0"], b["y0"])
            last["x1"] = max(last["x1"], b["x1"])
            last["y1"] = max(last["y1"], b["y1"])
        else:
            lines.append(dict(b))
    return [
        {
            "x0": round4(b["x0"]),
            "y0": round4(b["y0"]),
            "x1": round4(b["x1"]),
            "y1": round4(b["y1"]),
        }
        for b in lines
    ]


def main() -> None:
    build_pdf()

    doc = fitz.open(PDF_OUT)
    full_text = ""
    words = []  # { start, end, page, x0, y0, x1, y1 } normalized
    for pno in range(doc.page_count):
        page = doc[pno]
        pw, ph = page.rect.width, page.rect.height
        # get_text("words") -> (x0, y0, x1, y1, word, block, line, word_no) in order
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
    spans = window_chunks(full_text)

    chunks = []
    for i, (start, end) in enumerate(spans):
        hit = [w for w in words if w["end"] > start and w["start"] < end]
        by_page = {}
        for w in hit:
            by_page.setdefault(w["page"], []).append(w)
        highlights = []
        for page in sorted(by_page):
            highlights.append(
                {"page": page, "boxes": merge_line_boxes(by_page[page])}
            )
        if not highlights:
            continue
        text = " ".join(full_text[start:end].split())
        chunks.append(
            {
                "id": f"claude-stuff-c{i + 1:02d}",
                "index": i,
                "page": highlights[0]["page"],
                "start": start,
                "end": end,
                "length": end - start,
                "text": text,
                "highlights": highlights,
            }
        )

    out = {
        "source": SOURCE_NAME,
        "page": 1,
        "method": "pymupdf-text-positions",
        "params": {
            "parser": "PyMuPDF get_text('words')",
            "chunkSize": CHUNK_SIZE,
            "chunkOverlap": CHUNK_OVERLAP,
            "separators": SEPARATORS,
            "coordinateSpace": "normalized-page",
        },
        "chunks": chunks,
        "fullText": full_text,
    }

    with open(JSON_OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"pages: {doc.page_count}, words: {len(words)}, chunks: {len(chunks)}")
    print(f"wrote {PDF_OUT} and {JSON_OUT}")


if __name__ == "__main__":
    main()
