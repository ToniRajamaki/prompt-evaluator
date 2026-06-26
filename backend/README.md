# Chat backend (PydanticAI)

Minimal FastAPI server that powers the chat panel using PydanticAI + OpenAI.

## Setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # then put your real OPENAI_API_KEY in .env
```

## Run

```bash
python -m uvicorn main:app --port 8000 --reload
```

The frontend talks to `http://localhost:8000` by default. Override with
`VITE_API_URL` (see `../.env.example`).

## Endpoints

- `GET  /api/health` — status + active model
- `POST /api/chat` — body `{ "messages": [{ "role": "user", "text": "..." }] }`,
  returns `{ "reply": "..." }`
- `POST /api/chat/stream` — same body as `/api/chat`, but streams the reply as
  plain-text (`text/plain`) deltas as the model produces them. The frontend chat
  panel uses this endpoint for the live typewriter effect.
