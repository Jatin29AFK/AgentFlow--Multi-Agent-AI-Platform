# LinkedIn Post Draft

I built **AgentFlow**, a full-stack **multi-agent AI orchestration platform** with **FastAPI, LangGraph, Groq, React, and SQLite**.

Instead of stopping at a single LLM call, this project runs tasks through a structured workflow:

- memory retrieval
- supervisor routing
- specialist agent execution
- tool usage
- reviewer scoring
- human-in-the-loop approval
- traceable run history

The goal was to explore what a more realistic AI product looks like beyond a simple chatbot UI.

Some parts I’m especially happy with:

- workspace-scoped memory and run isolation for safer public demos
- a reviewer layer that scores outputs before finalization
- a human review queue for low-confidence runs
- a chat playground alongside the full agent workflow
- an end-to-end dashboard for traces, history, memory, and reviews

Live demo:
- Frontend: https://agent-flow-five-phi.vercel.app
- Backend: https://agentflow-mlmp.onrender.com

I’d love feedback from people building agent systems, AI products, or workflow tooling.

#AIEngineering #GenerativeAI #LLM #LangGraph #FastAPI #React #AIProducts
