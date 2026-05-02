from typing import List

from fastapi import APIRouter, Header, HTTPException, Query

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
def add_memory(
    request: MemoryCreateRequest,
    x_workspace_id: str | None = Header(default=None),
):
    """
    Manually save a memory.
    """
    memory = create_memory(
        workspace_id=_workspace_id_header(x_workspace_id),
        content=request.content,
        tags=request.tags or [],
        importance=request.importance,
    )

    return memory


@router.get("", response_model=List[MemoryResponse])
def get_memories(
    limit: int = Query(default=50, ge=1, le=200),
    x_workspace_id: str | None = Header(default=None),
):
    """
    List latest memories.
    """
    return list_memories(
        workspace_id=_workspace_id_header(x_workspace_id),
        limit=limit,
    )


@router.get("/search", response_model=List[MemorySearchResponse])
def search_memory(
    query: str = Query(..., min_length=2),
    limit: int = Query(default=5, ge=1, le=20),
    x_workspace_id: str | None = Header(default=None),
):
    """
    Search memories related to a query.
    """
    return search_memories(
        query=query,
        workspace_id=_workspace_id_header(x_workspace_id),
        limit=limit,
    )


@router.delete("/{memory_id}")
def remove_memory(
    memory_id: str,
    x_workspace_id: str | None = Header(default=None),
):
    """
    Delete a memory by ID.
    """
    deleted = delete_memory(memory_id, _workspace_id_header(x_workspace_id))

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Memory not found."
        )

    return {
        "message": "Memory deleted successfully.",
        "memory_id": memory_id,
    }
