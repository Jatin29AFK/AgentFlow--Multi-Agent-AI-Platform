from fastapi import FastAPI
from pydantic import BaseModel

from app.core.config import settings
from app.db.database import init_db
from app.routers.agent_router import router as agent_router
from app.routers.chat_router import router as chat_router
from app.routers.memory_router import router as memory_router

from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "AgentFlow: Multi-agent AI orchestration platform with planning, "
        "tools, memory, human review, and observability."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=(
        r"^http://(localhost|127\.0\.0\.1):\d+$"
        if settings.ENVIRONMENT == "development"
        else None
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


class HealthResponse(BaseModel):
    status: str
    app_name: str
    version: str
    environment: str


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to AgentFlow API",
        "docs": "/docs",
        "health": "/health",
        "chat": "/chat",
        "agent_workflow": "/agent/run",
        "agent_history": "/agent/runs",
        "memory": "/memory",
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health_check():
    return HealthResponse(
        status="ok",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
    )


app.include_router(chat_router)
app.include_router(agent_router)
app.include_router(memory_router)
