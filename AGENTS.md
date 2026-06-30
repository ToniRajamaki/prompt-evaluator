# AGENTS.md

Guidance for AI coding agents working in this repo. Keep changes minimal and consistent with the patterns below.

## What this project is

A "chat with your documents" web app (the UI calls itself **SourceChat**):
- **Frontend**: Vite + React 19 + TypeScript + Tailwind CSS v4. Entry: [src/main.tsx](src/main.tsx) → [src/App.tsx](src/App.tsx) → [src/notebook/NotebookApp.tsx](src/notebook/NotebookApp.tsx).
- **Backend**: FastAPI + PydanticAI chat server in [backend/](backend/). See [backend/README.md](backend/README.md).

The repo name (`prompt-evaluator`) and the root [README.md](README.md) reflect an earlier concept; the active product is the notebook app.

## Commands

Frontend (run from repo root):
- `npm run dev` — start Vite dev server
- `npm run build` — type-check then build (`tsc -b && vite build`)
- `npm run lint` — lint with **oxlint** (not ESLint)

Backend (run from [backend/](backend/)):
- `pip install -r requirements.txt`, then copy `.env.example` → `.env` and set `OPENAI_API_KEY`
- `python -m uvicorn main:app --port 8000 --reload`

## Architecture & conventions

- **The live app is `src/notebook/`.** Treat `src/components/`, [src/data/mockData.ts](src/data/mockData.ts), [src/types.ts](src/types.ts), and [src/utils/scores.ts](src/utils/scores.ts) as **legacy/orphaned** code from the old prompt-evaluator concept — nothing imports them into the running app. Don't extend them unless explicitly asked; prefer working under `src/notebook/`.
- **Sources come from `/files/`.** [src/notebook/fileRegistry.ts](src/notebook/fileRegistry.ts) discovers `.pdf/.md/.txt` via `import.meta.glob('/files/**')`. Add documents by dropping files in [files/](files/), not by editing registries.
- **Chunking is dual-path** ([src/notebook/NotebookApp.tsx](src/notebook/NotebookApp.tsx)):
  - PDFs use **prebuilt** JSON from [src/notebook/data/](src/notebook/data/) (`*.chunks.json`), looked up via [chunksRegistry.ts](src/notebook/data/chunksRegistry.ts).
  - `.md`/`.txt` are chunked **at runtime** by [src/notebook/chunker.ts](src/notebook/chunker.ts), which mirrors the JSON shape.
- **PDF highlights** are normalized boxes (`x0,y0,x1,y1` in 0..1) generated offline by PyMuPDF in [scripts/generate_claude_pdf.py](scripts/generate_claude_pdf.py); runtime only scales them. Regenerate chunk JSON via that script rather than hand-editing.
- **Chat is currently mock-wired.** [ChatPanel.tsx](src/notebook/components/ChatPanel.tsx) and [Sidebar.tsx](src/notebook/components/Sidebar.tsx) use [mockChat.ts](src/notebook/api/mockChat.ts) / [mockData.ts](src/notebook/mockData.ts). The real backend client in [src/notebook/api/chat.ts](src/notebook/api/chat.ts) (`sendChat` / `sendChatStream`, base URL from `VITE_API_URL`) exists but is not yet hooked up — wire it in when asked to "connect the backend."
- **Styling** is Tailwind utility classes inline in JSX; there are no CSS modules. Match the existing class-string style.
- **Types** live in [src/notebook/types.ts](src/notebook/types.ts) — reuse `SourceFile`, `Chunk`, `ChunkSet`, `Citation`, `ChatMessage` rather than redefining shapes.

## Gotchas

- Lint uses **oxlint**; don't add ESLint config or assume ESLint rules.
- TypeScript is split: [tsconfig.app.json](tsconfig.app.json) (browser/`src`) vs [tsconfig.node.json](tsconfig.node.json) (Vite config). `npm run build` runs the project-references build.
- Frontend↔backend message shape is `{ role, text }` (see [backend/main.py](backend/main.py) and [chat.ts](src/notebook/api/chat.ts)); keep both sides in sync if you change it.
