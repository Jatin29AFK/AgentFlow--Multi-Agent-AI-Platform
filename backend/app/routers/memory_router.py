import asyncio
from typing import List

from fastapi import APIRouter, Header, HTTPException, Query, Request

from app.core.config import settings
from app.core.rate_limit import limiter
from app.repositories.memory_repository import (
    create_memory,
    delete_memory,
    list_memories,
    search_memories,
)
from app.schemas.memory_schema import (
    MemoryCreateRequest,
    MemoryResponse,
    MemorySearchResponse,
)


router = APIRouter(prefix="/memory", tags=["Memory"])


def _workspace_id_header(x_workspace_id: str | None) -> str:
    return (x_workspace_id or "default-workspace").strip() or "default-workspace"


@router.post("", response_model=MemoryResponse)
@limiter.limit(settings.RATE_LIMIT_MEMORY_WRITE)
async def add_memory(
    request: Request,
    body: MemoryCreateRequest,
    x_workspace_id: str | None = Header(default=None),
):
    return await asyncio.to_thread(
        create_memory,
        _workspace_id_header(x_workspace_id),
        body.content,
        None,
        body.tags or [],
        body.importance,
    )


@router.get("", response_model=List[MemoryResponse])
async def get_memories(
    limit: int = Query(default=50, ge=1, le=200),
    x_workspace_id: str | None = Header(default=None),
):
    return await asyncio.to_thread(
        list_memories,
        _workspace_id_header(x_workspace_id),
        limit,
    )


@router.get("/search", response_model=List[MemorySearchResponse])
async def search_memory(
    query: str = Query(..., min_length=2, max_length=2000),
    limit: int = Query(default=5, ge=1, le=20),
    x_workspace_id: str | None = Header(default=None),
):
    return await asyncio.to_thread(
        search_memories,
        query,
        _workspace_id_header(x_workspace_id),
        limit,
    )


@router.delete("/{memory_id}")
@limiter.limit(settings.RATE_LIMIT_MEMORY_WRITE)
async def remove_memory(
    request: Request,
    memory_id: str,
    x_workspace_id: str | None = Header(default=None),
):
    deleted = await asyncio.to_thread(
        delete_memory,
        memory_id,
        _workspace_id_header(x_workspace_id),
    )

    if not deleted:
        raise HTTPException(status_code=404, detail="Memory not found.")

    return {
        "message": "Memory deleted successfully.",
        "memory_id": memory_id,
    }
