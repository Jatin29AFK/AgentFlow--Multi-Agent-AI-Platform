# AgentFlow — Multi-Agent AI Orchestration Platform

![Python](https://img.shields.io/badge/Python-3.11-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-green)
![React](https://img.shields.io/badge/React-Frontend-blue)
![LangGraph](https://img.shields.io/badge/LangGraph-Agentic_AI-purple)
![Groq](https://img.shields.io/badge/Groq-LLM_API-orange)
![SQLite](https://img.shields.io/badge/SQLite-Local_DB-lightgrey)
![License](https://img.shields.io/badge/License-MIT-yellow)

AgentFlow is a full-stack **multi-agent AI orchestration platform** built with **FastAPI, LangGraph, Groq, React, SQLite, and Tailwind CSS**.

It demonstrates how production-style AI agents can plan tasks, route work to specialist agents, use backend tools, retrieve long-term memory, review outputs, pause for human approval, and store execution traces for observability.

This project is built to showcase practical **AI engineering**, **agentic AI**, and **full-stack GenAI system design** skills beyond a basic chatbot.

---

## Live Demo

- **Frontend App:** https://agent-flow-five-phi.vercel.app
- **Backend API:** https://agentflow-mlmp.onrender.com

---

## Why I Built This

Most AI applications stop at a single LLM call:

```txt
User → LLM → Response
```

But real AI systems need more than that. Production-level AI applications often require:

- Task planning
- Agent routing
- Tool execution
- Memory retrieval
- Output review
- Human approval
- Run history
- Traceability
- Observability

AgentFlow was built to simulate a realistic AI agent platform where every task goes through a controlled workflow.

```txt
User Task
   ↓
Memory Retriever
   ↓
Supervisor Agent
   ↓
Tool Node
   ↓
Specialist Agent
   ↓
Reviewer Agent
   ↓
Score Check
   ├── High Score → Finalizer Agent → Completed
   └── Low Score  → Human Review → Approve / Revise / Reject
   ↓
Save Run History
   ↓
Extract Useful Memory
```

---

## Key Features

### Multi-Agent Workflow

AgentFlow uses a supervisor-led multi-agent workflow where every task is routed to the most suitable specialist agent.

Specialist agents include:

- **Research Agent** — explains, compares, summarizes, and provides concept-level answers
- **Code Agent** — handles coding, debugging, backend/frontend architecture, and implementation tasks
- **Writing Agent** — creates resume bullets, LinkedIn posts, emails, captions, and documentation
- **Analysis Agent** — handles decision-making, trade-offs, recommendations, and problem breakdowns

---

### Supervisor Agent Routing

The Supervisor Agent analyzes the user task and decides:

- Which specialist agent should handle the task
- Whether a backend tool is required
- What execution plan should be followed

Example:

```txt
Task: Create resume bullets for my AI project
Selected Agent: Writing Agent

Task: Write a FastAPI endpoint
Selected Agent: Code Agent

Task: Compare RAG and fine-tuning
Selected Agent: Research Agent
```

---

### Tool Registry

AgentFlow includes a backend tool registry that allows the workflow to use deterministic tools instead of relying only on LLM text generation.

Current tools:

| Tool | Purpose |
|---|---|
| Calculator Tool | Performs safe arithmetic calculations |
| Text Statistics Tool | Counts words, characters, sentences, and lines |
| Keyword Extractor Tool | Extracts important terms and ATS-style keywords |

This makes the project closer to a real agentic system because the LLM can decide when to use external tools.

---

### Long-Term Memory

AgentFlow stores useful memories in SQLite and retrieves relevant context before every workflow run.

Memory can store:

- User preferences
- Project details
- Tech stack information
- Writing style preferences
- Resume preferences
- Long-term reusable context

Example memory:

```txt
User prefers simple, professional, human-sounding resume bullets with measurable impact.
```

When the user later asks for resume bullets, AgentFlow retrieves this memory and uses it during planning and generation.

---

### Reviewer Agent

After a specialist agent completes the task, a Reviewer Agent evaluates the output.

It checks:

- Clarity
- Completeness
- Correctness
- Usefulness
- Alignment with the original task

The reviewer assigns a score from `1` to `10`.

Example:

```txt
Score: 8/10

The answer is clear and useful, but it can be improved by adding stronger technical keywords and measurable impact.
```

---

### Human-in-the-Loop Review

If the reviewer score is below the configured threshold, AgentFlow pauses the workflow and marks it for human review.

A human reviewer can:

- **Approve** the output
- **Revise** the output with feedback
- **Reject** the output

This adds a production-style safety and quality-control layer.

Example human review request:

```json
{
  "action": "revise",
  "feedback": "Make the answer shorter, more professional, and more resume-friendly."
}
```

---

### Trace History and Observability

Every workflow run is saved with detailed trace information.

Each run stores:

- Original task
- Retrieved memory
- Selected agent
- Tool used
- Tool result
- Reviewer score
- Final status
- Human review decision
- Final answer
- Trace timeline

Example trace:

```txt
1. Memory Retriever found 2 relevant long-term memories.
2. Supervisor selected 'writing' agent and 'none' tool.
3. Tool Node skipped because no tool was needed.
4. Writing Agent completed the task.
5. Reviewer Agent reviewed output and assigned score 8/10.
6. Finalizer Agent produced the final polished answer.
```

This helps debug agent decisions and makes the system observable.

---

## Tech Stack

### Backend

| Technology | Purpose |
|---|---|
| Python | Backend programming language |
| FastAPI | API development |
| LangGraph | Multi-agent workflow orchestration |
| LangChain | LLM integration layer |
| Groq | LLM inference provider |
| SQLite | Local database for runs and memory |
| Pydantic | Request and response validation |
| Uvicorn | ASGI server |

### Frontend

| Technology | Purpose |
|---|---|
| React | Frontend UI |
| Vite | Frontend build tool |
| Tailwind CSS | Styling |
| JavaScript | UI logic |

### Deployment

| Platform | Purpose |
|---|---|
| Render | Backend deployment |
| Vercel | Frontend deployment |
| GitHub Actions | Optional CI checks |

---

## System Architecture

```txt
Frontend Dashboard
├── Run Agent Tab
├── Run History Tab
├── Human Reviews Tab
└── Memory Management Tab

Backend API
├── FastAPI Routers
├── LangGraph Agent Workflow
├── LLM Service
├── Tool Registry
├── Memory Service
├── Human Review Service
├── SQLite Repository Layer
└── Database Initialization
```

---

## Agent Workflow Architecture

```txt
User Task
   ↓
Memory Retriever Node
   ↓
Supervisor Agent
   ↓
Tool Node
   ↓
Conditional Specialist Routing
   ├── Research Agent
   ├── Code Agent
   ├── Writing Agent
   └── Analysis Agent
   ↓
Reviewer Agent
   ↓
Conditional Score Routing
   ├── Finalizer Agent
   └── Human Review Node
   ↓
SQLite Persistence
   ↓
Memory Extraction
```

---

## Project Structure

```txt
AgentFlow/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── agent_graph.py
│   │   │   ├── agent_state.py
│   │   │   └── workflow_nodes.py
│   │   │
│   │   ├── core/
│   │   │   └── config.py
│   │   │
│   │   ├── db/
│   │   │   └── database.py
│   │   │
│   │   ├── repositories/
│   │   │   ├── agent_run_repository.py
│   │   │   └── memory_repository.py
│   │   │
│   │   ├── routers/
│   │   │   ├── agent_router.py
│   │   │   ├── chat_router.py
│   │   │   └── memory_router.py
│   │   │
│   │   ├── schemas/
│   │   │   ├── agent_schema.py
│   │   │   ├── chat_schema.py
│   │   │   └── memory_schema.py
│   │   │
│   │   ├── services/
│   │   │   ├── human_review_service.py
│   │   │   ├── llm_service.py
│   │   │   └── memory_service.py
│   │   │
│   │   └── tools/
│   │       └── tool_registry.py
│   │
│   ├── main.py
│   ├── requirements.txt
│   ├── runtime.txt
│   ├── .env.example
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── package.json
│   ├── vite.config.js
│   ├── .env.example
│   └── README.md
│
├── docs/
│   ├── architecture.md
│   ├── api-reference.md
│   ├── deployment.md
│   └── screenshots/
│       ├── dashboard.png
│       ├── agent-run.png
│       ├── trace-timeline.png
│       ├── history.png
│       ├── human-review.png
│       ├── memory.png
│       └── api-docs.png
│
├── .github/
│   └── workflows/
│       ├── backend-check.yml
│       └── frontend-check.yml
│
├── README.md
├── .gitignore
├── LICENSE
└── CONTRIBUTING.md
```

---

## Screenshots

### Dashboard

![AgentFlow Dashboard](docs/screenshots/dashboard.png)

### Agent Run

![Agent Run](docs/screenshots/agent-run.png)

### Trace Timeline

![Trace Timeline](docs/screenshots/trace-timeline.png)

### Run History

![Run History](docs/screenshots/history.png)

### Human Review

![Human Review](docs/screenshots/human-review.png)

### Memory Management

![Memory Management](docs/screenshots/memory.png)

### Swagger API Docs

![API Docs](docs/screenshots/api-docs.png)

---

## Local Setup

### Prerequisites

Make sure you have:

- Python 3.11+
- Node.js 20+
- npm
- Git
- Groq API key

---

## Backend Setup

Go to backend folder:

```bash
cd backend
```

Create virtual environment:

```bash
python3 -m venv venv
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create `.env` file:

```bash
cp .env.example .env
```

Update `.env`:

```env
APP_NAME=AgentFlow
APP_VERSION=0.1.0
ENVIRONMENT=development

GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant

SQLITE_DB_PATH=agentflow.db
HUMAN_REVIEW_SCORE_THRESHOLD=7

ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174
```

Run backend:

```bash
uvicorn main:app --reload
```

Backend will run at:

```txt
http://127.0.0.1:8000
```

Swagger API docs:

```txt
http://127.0.0.1:8000/docs
```

Health check:

```txt
http://127.0.0.1:8000/health
```

---

## Frontend Setup

Go to frontend folder:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create `.env` file:

```bash
cp .env.example .env
```

Update `.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Run frontend:

```bash
npm run dev
```

Frontend will run at:

```txt
http://localhost:5173
```

If port `5173` is already in use, Vite may run on `5174`. That is okay. Just make sure backend CORS allows that port.

---

## Environment Variables

### Backend `.env.example`

```env
APP_NAME=AgentFlow
APP_VERSION=0.1.0
ENVIRONMENT=development

GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant

SQLITE_DB_PATH=agentflow.db
HUMAN_REVIEW_SCORE_THRESHOLD=7

ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174
```

### Frontend `.env.example`

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

---

## API Endpoints

### Health

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Check backend health |
| GET | `/` | Root API information |

---

### Chat

| Method | Endpoint | Description |
|---|---|---|
| POST | `/chat` | Simple LLM chat endpoint |

Example request:

```json
{
  "message": "Explain AI agents in simple words."
}
```

---

### Agent Workflow

| Method | Endpoint | Description |
|---|---|---|
| POST | `/agent/run` | Run full AgentFlow workflow |
| GET | `/agent/runs` | Get recent workflow runs |
| GET | `/agent/runs/{run_id}` | Get one workflow run detail |
| GET | `/agent/reviews/pending` | Get runs waiting for human review |
| POST | `/agent/runs/{run_id}/human-review` | Submit human review action |

Example request:

```json
{
  "task": "Create 3 resume bullets for AgentFlow project."
}
```

Example response fields:

```json
{
  "run_id": "uuid",
  "task": "Create 3 resume bullets for AgentFlow project.",
  "retrieved_memories": [],
  "memory_context": "No relevant long-term memory found for this task.",
  "selected_agent": "writing",
  "route_reason": "The task requires professional resume writing.",
  "tool_name": "none",
  "tool_used": false,
  "score": 8,
  "status": "COMPLETED",
  "needs_human_review": false,
  "final_answer": "...",
  "trace": []
}
```

---

### Human Review

Example request:

```json
{
  "action": "revise",
  "feedback": "Make the answer shorter, more professional, and more resume-friendly."
}
```

Allowed actions:

```txt
approve
revise
reject
```

---

### Memory

| Method | Endpoint | Description |
|---|---|---|
| POST | `/memory` | Add memory manually |
| GET | `/memory` | List saved memories |
| GET | `/memory/search?query=...` | Search memories |
| DELETE | `/memory/{memory_id}` | Delete memory |

Example memory request:

```json
{
  "content": "User prefers simple resume bullets with measurable impact.",
  "tags": ["resume", "preference"],
  "importance": 5
}
```

---

## Example Usage

### Add Memory

```json
{
  "content": "AgentFlow is a multi-agent AI orchestration project built using FastAPI, LangGraph, Groq, SQLite, tools, memory, human review, and React.",
  "tags": ["agentflow", "project", "tech-stack"],
  "importance": 5
}
```

### Run Agent Workflow

```json
{
  "task": "Create 3 strong resume bullets for AgentFlow project."
}
```

### Submit Human Review

```json
{
  "action": "revise",
  "feedback": "Make it more concise and add stronger AI engineering keywords."
}
```

---

## Frontend Dashboard

The React dashboard includes four main tabs:

### 1. Run Agent

Used to submit a task and view:

- Final answer
- Selected agent
- Tool used
- Reviewer score
- Workflow status
- Memory used
- Trace timeline
- Reviewer feedback

### 2. Run History

Used to view previous workflow runs saved in SQLite.

### 3. Human Reviews

Used to approve, revise, or reject low-confidence agent outputs.

### 4. Memory

Used to add, search, view, and delete long-term memories.

---

## Deployment

### Backend Deployment on Render

Create a new Render Web Service.

Use these settings:

```txt
Root Directory: backend
Build Command: pip install -r requirements.txt
Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
```

Add these environment variables in Render:

```env
APP_NAME=AgentFlow
APP_VERSION=0.1.0
ENVIRONMENT=production

GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant

SQLITE_DB_PATH=agentflow.db
HUMAN_REVIEW_SCORE_THRESHOLD=7

ALLOWED_ORIGINS=https://your-vercel-frontend-url.vercel.app
```

After deployment, test:

```txt
https://your-render-backend-url.onrender.com/health
```

Swagger docs:

```txt
https://your-render-backend-url.onrender.com/docs
```

---

### Frontend Deployment on Vercel

Create a new Vercel project.

Use these settings:

```txt
Root Directory: frontend
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

Add this environment variable in Vercel:

```env
VITE_API_BASE_URL=https://your-render-backend-url.onrender.com
```

After deployment, update Render backend `ALLOWED_ORIGINS` with your Vercel frontend URL.

Example:

```env
ALLOWED_ORIGINS=https://agentflow.vercel.app
```

For local + production:

```env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,https://agentflow.vercel.app
```

---

## Important Note About SQLite

This project currently uses SQLite for simplicity and beginner-friendly local development.

SQLite is good for:

- Local development
- Portfolio demo
- Simple run history
- Learning database persistence

For production deployment, PostgreSQL or Supabase is recommended because free hosting platforms may not persist SQLite files permanently after restarts or redeployments.

Recommended future upgrade:

```txt
SQLite → PostgreSQL / Supabase
```

---

## Security Notes

This project follows basic safety practices:

- API keys are stored in `.env`
- `.env` is ignored using `.gitignore`
- `.env.example` is provided for setup reference
- CORS origins are configurable through environment variables
- Human review is triggered for low-confidence outputs
- Backend tools are implemented safely instead of using unrestricted code execution

---

## Suggested Tech Stack Line

```txt
Python, FastAPI, LangGraph, LangChain, Groq, React, Vite, Tailwind CSS, SQLite, Pydantic, Render, Vercel
```

---

## Author

Built by **Jatin Shukla**.

---
