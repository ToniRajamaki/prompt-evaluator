# SourceChat

Chat with your documents and get **source-grounded answers** — every cited
passage is highlighted right in the original `md`, `txt`, or `pdf`.

## What you need first

- **Node.js** (for the frontend)
- **Python** (for the backend)
- **Docker Desktop** (for the database)
- An **OpenAI API key**

# Run it in 3 steps

You need **3 things running**: the database, the backend, and the frontend.
Open a terminal in the project folder and do the following.

### 1. Start the database

```bash
docker compose up -d
```

### 2. Start the backend

```bash
cd backend
pip install -r requirements.txt   
copy .env.example .env           
```

Open the new `backend/.env` file and paste your OpenAI key:

```
OPENAI_API_KEY=sk-your-key-here
```

Then start the server:
```bash
python -m uvicorn main:app --port 8000 --reload
```



### 3. Start the frontend
```bash
npm install 
npm run dev
```

Open the link it prints (e.g. http://localhost:5173) in your browser.

## "Backend is offline"?

Check these, in order:

1. The database is running: `docker compose up -d`.
2. The backend terminal shows **`Application startup complete.`** If it's stuck
   on `Waiting for application startup`, your `OPENAI_API_KEY` is probably
   missing or wrong in `backend/.env`.
3. The backend is on port **8000**. Test it by opening
   http://localhost:8000/api/health — you should see `{"status":"ok",...}`.

## Other commands

```bash
npm run build    # type-check + production build
npm run lint     # lint with oxlint
npm run preview  # preview the production build
```

## Project layout

- `src/notebook/` — the app UI (document viewer, chat, sources panel)
- `backend/` — the chat + search server (FastAPI)
- `files/` — sample documents loaded on first run
- `scripts/` — offline tooling to rebuild PDF highlight data (PyMuPDF)

Built with React + TypeScript + Vite, Tailwind, and `pdfjs-dist`.
