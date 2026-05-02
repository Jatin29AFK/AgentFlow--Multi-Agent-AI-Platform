from typing import List, Optional, TypedDict


class AgentState(TypedDict):
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
    human_decision: Optional[str]
    human_feedback: Optional[str]
    reviewed_at: Optional[str]

    trace: List[str]