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