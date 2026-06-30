# SourceChat

Chat with your documents and get **source-grounded answers** — each cited
passage is highlighted directly in the original `md`, `txt`, or `pdf`.

> The chat is currently **mocked** (no backend yet): answers cite real chunks
> from the loaded document so the citation/highlight UX works end to end. The
> highlighting itself is real.

## How highlighting works

Documents are split into overlapping chunks; a citation maps back to a chunk,
which is highlighted in the viewer.

- **md / txt and text PDFs** — chunk text is matched live against the document
  text to position highlights.
- **PDFs** can also ship **precomputed boxes**: normalized `{x0, y0, x1, y1}`
  coordinates per chunk (relative to the page), extracted offline with PyMuPDF —
  **no OCR**. The runtime just scales them to the rendered page.

Scanned/image PDFs have no text layer, so they must be given a real text layer
(or OCR'd in a backend) before positions can be extracted.

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build
npm run lint     # oxlint
npm run preview  # preview the build
```

## Regenerating PDF chunk data

`*.chunks.json` files under `src/notebook/data/` hold each PDF's chunks and
highlight boxes. To rebuild the sample PDF + boxes:

```bash
pip install pymupdf
python scripts/generate_claude_pdf.py
```

## Project layout

- `src/notebook/` — app UI (viewer, chat, sources panel)
- `src/notebook/data/*.chunks.json` — per-PDF chunks + normalized highlight boxes
- `src/notebook/chunker.ts` — runtime chunking for md/txt
- `files/` — sample source documents
- `scripts/` — offline data-generation tooling (PyMuPDF)

Built with React + TypeScript + Vite, Tailwind, and `pdfjs-dist`.
