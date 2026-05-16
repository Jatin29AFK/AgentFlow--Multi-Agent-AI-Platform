from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class AgentRunRequest(BaseModel):
    task: str = Field(
        ...,
        min_length=5,
        max_length=2000,
        description="Complex task that AgentFlow should route to the right specialist agent."
    )


class AgentRunResponse(BaseModel):
    run_id: str
    created_at: str

    task: str

    retrieved_memories: List[str]
    memory_context: str

    selected_agent: str
    route_reason: str
    plan: str

    tool_name: str
    tool_input: str
    tool_result: str
    tool_used: bool

    execution_result: str
    review: str
    score: int
    final_answer: str

    status: str
    needs_human_review: bool
    human_decision: Optional[str] = None
    human_feedback: Optional[str] = None
    reviewed_at: Optional[str] = None

    trace: List[str]


class AgentRunSummaryResponse(BaseModel):
    id: str
    task: str
    selected_agent: str
    tool_name: str
    tool_used: bool
    score: int
    status: str
    needs_human_review: bool
    created_at: str


class HumanReviewRequest(BaseModel):
    action: Literal["approve", "revise", "reject"] = Field(
        ...,
        description="Human decision for this run."
    )
    feedback: Optional[str] = Field(
        default=None,
        max_length=2000,
        description="Optional human feedback. Required for revise. Recommended for reject."
    )
