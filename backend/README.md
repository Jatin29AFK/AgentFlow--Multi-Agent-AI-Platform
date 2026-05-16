# AgentFlow Backend

FastAPI backend for AgentFlow's multi-agent orchestration workflow.

## What It Does

- Runs a LangGraph workflow with memory retrieval, supervisor routing, tool execution, specialist generation, reviewer scoring, and finalization.
- Streams workflow progress through Server-Sent Events at `/agent/run/stream`.
- Supports Groq, OpenAI, and Ollama through one `LLMService` abstraction.
- Stores run history, human review state, and long-term memory in SQLite.
- Uses optional sentence-transformer embeddings for semantic memory and falls back to lexical search when the optional package is not installed.
- Adds production-minded basics: request IDs, structured logs, retry handling, rate limiting, CORS config, SQLite WAL mode, and optional review webhooks.

## Local Setup

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

Set at least one LLM provider key in `.env`:

```env
LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key_here
```

Optional semantic embeddings:

```bash
pip install -r requirements-embeddings.txt
```

## Useful URLs

- API root: `http://127.0.0.1:8000`
- Health: `http://127.0.0.1:8000/health`
- Swagger docs: `http://127.0.0.1:8000/docs`

## Render Deployment

```txt
Root Directory: backend
Build Command: pip install -r requirements.txt
Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
```

For full semantic embeddings on a larger Render instance:

```txt
Build Command: pip install -r requirements-embeddings.txt
```

Production CORS example:

```env
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
ALLOWED_ORIGIN_REGEX=^https://.*\.vercel\.app$
```

## Tests

```bash
python -m unittest discover -s tests -v
python -m compileall app main.py
```
