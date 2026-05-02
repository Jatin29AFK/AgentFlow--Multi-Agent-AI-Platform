# AgentFlow Backend

AgentFlow is a multi-agent AI orchestration backend built with FastAPI, LangGraph, Groq, SQLite, tool use, memory, human review, and trace history.

## Features

- Supervisor agent routing
- Specialist agents: research, code, writing, analysis
- Tool registry: calculator, text stats, keyword extractor
- Reviewer scoring
- Human-in-the-loop review
- SQLite run history
- Long-term memory
- FastAPI Swagger docs

## Local Setup

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

## CORS for deployed frontend

For a Vercel frontend talking to this backend, configure these env vars on the
backend service:

```bash
ALLOWED_ORIGINS=https://your-production-domain.vercel.app
ALLOWED_ORIGIN_REGEX=^https://.*\.vercel\.app$
```

`ALLOWED_ORIGINS` is useful for exact production domains. `ALLOWED_ORIGIN_REGEX`
lets Vercel preview deployments work without updating the backend for each new
preview URL.
