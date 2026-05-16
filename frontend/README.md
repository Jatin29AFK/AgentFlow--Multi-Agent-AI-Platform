# AgentFlow Frontend

React + Vite dashboard for AgentFlow.

## What It Does

- Runs structured agent workflows through the Run Agent tab.
- Shows live workflow progress from SSE streaming events.
- Provides a separate Chat Playground for direct conversation with session history.
- Displays run history with server-side search, status filtering, pagination, detail view, and JSON export.
- Supports human review actions for low-scoring outputs.
- Manages workspace-scoped long-term memory.
- Uses focused components and hooks instead of one large app file.

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Environment:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Vercel Deployment

```txt
Root Directory: frontend
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

Set:

```env
VITE_API_BASE_URL=https://your-render-service.onrender.com
```

## Checks

```bash
npm run lint
npm test
npm run build
```
