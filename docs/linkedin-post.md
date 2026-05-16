# LinkedIn Post Draft

I built AgentFlow, a full-stack multi-agent AI orchestration platform that goes beyond a basic chatbot.

Instead of sending a prompt directly to one model, AgentFlow runs a structured workflow:

- Retrieves relevant long-term memory
- Routes the task through a supervisor agent
- Uses backend tools when useful
- Sends the task to a specialist agent
- Reviews and scores the output
- Sends low-confidence runs to human review
- Streams progress to the UI in real time
- Stores searchable run history and reusable memory

Tech stack:

Python, FastAPI, LangGraph, LangChain, React, Vite, Tailwind CSS, SQLite, Groq/OpenAI/Ollama provider abstraction, Render, and Vercel.

Some engineering details I focused on:

- Server-Sent Events for live workflow updates
- Semantic memory with optional sentence-transformer embeddings
- Tool-loop guardrails so tools are used only when they fit the task
- Human-in-the-loop review flow
- Workspace-scoped history and memory for safer public demos
- Structured logging, retries, rate limiting, CORS, and deployment-ready env templates
- A cleaner React architecture split into focused components and hooks

This project helped me practice the product and systems side of AI engineering: not just calling an LLM, but designing an observable, reviewable, and deployable agent workflow.

GitHub: <add repo link>
Live demo: <add Vercel link>
