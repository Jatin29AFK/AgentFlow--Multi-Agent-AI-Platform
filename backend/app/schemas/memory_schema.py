from typing import List, Optional

from pydantic import BaseModel, Field


class MemoryCreateRequest(BaseModel):
    content: str = Field(
        ...,
        min_length=3,
        description="Memory content to save."
    )
    tags: Optional[List[str]] = Field(
        default=[],
        description="Optional memory tags."
    )
    importance: int = Field(
        default=3,
        ge=1,
        le=5,
        description="Memory importance from 1 to 5."
    )


class MemoryResponse(BaseModel):
    id: str
    content: str
    source_run_id: Optional[str] = None
    tags: List[str]
    importance: int
    created_at: str
    updated_at: str


class MemorySearchResponse(MemoryResponse):
    search_score: int
    matched_terms: List[str]