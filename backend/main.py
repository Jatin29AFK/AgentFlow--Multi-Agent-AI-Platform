import asyncio
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.core.rate_limit import limiter
from app.db.database import init_db
from app.routers.agent_router import router as agent_router
from app.routers.chat_router import router as chat_router
from app.routers.memory_router import router as memory_router


configure_logging()
logger = get_logger(__name__)

try:
    from slowapi import _rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded
    from slowapi.middleware import SlowAPIMiddleware
except ModuleNotFoundError:
    _rate_limit_exceeded_handler = None
    SlowAPIMiddleware = None

    class RateLimitExceeded(Exception):
        pass

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "AgentFlow: Multi-agent AI orchestration platform with planning, "
        "tools, memory, human review, streaming, and observability."
    ),
)
app.state.limiter = limiter

if getattr(limiter, "enabled", False) and _rate_limit_exceeded_handler and SlowAPIMiddleware:
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)
else:
    logger.warning(
        "SlowAPI is not installed. Rate limiting is disabled until optional dependencies are installed."
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
    request.state.request_id = request_id

    start_time = time.perf_counter()
    logger.info(
        "Request started.",
        extra={
            "request_id": request_id,
        },
    )

    try:
        response = await call_next(request)
    except RateLimitExceeded:
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.warning(
            "Request rate limited.",
            extra={
                "request_id": request_id,
                "duration_ms": duration_ms,
            },
        )
        raise
    except Exception as exc:
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.exception(
            "Request failed.",
            extra={
                "request_id": request_id,
                "duration_ms": duration_ms,
            },
        )
        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal server error: {exc}"},
        )

    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
    response.headers["X-Request-Id"] = request_id
    logger.info(
        "Request completed.",
        extra={
            "request_id": request_id,
            "duration_ms": duration_ms,
            "status": response.status_code,
        },
    )
    return response


@app.on_event("startup")
async def on_startup():
    await asyncio.to_thread(init_db)
    logger.info("Database initialized.")


class HealthResponse(BaseModel):
    status: str
    app_name: str
    version: str
    environment: str
    llm_provider: str
    default_model: str


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to AgentFlow API",
        "docs": "/docs",
        "health": "/health",
        "chat": "/chat",
        "agent_workflow": "/agent/run",
        "agent_workflow_stream": "/agent/run/stream",
        "agent_history": "/agent/runs",
        "memory": "/memory",
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    return HealthResponse(
        status="ok",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        llm_provider=settings.LLM_PROVIDER,
        default_model=settings.default_model,
    )


app.include_router(chat_router)
app.include_router(agent_router)
app.include_router(memory_router)
