from langgraph.graph import END, START, StateGraph

from app.agents.agent_state import AgentState
from app.agents.workflow_nodes import (
    analysis_agent_node,
    code_agent_node,
    finalizer_node,
    human_review_node,
    memory_retriever_node,
    research_agent_node,
    reviewer_node,
    supervisor_node,
    tool_node,
    writing_agent_node,
)
from app.core.config import settings


def route_to_specialist(state: AgentState) -> str:
    """
    Chooses which specialist agent node should run.
    This depends on supervisor_node output.
    """
    selected_agent = state.get("selected_agent", "analysis").lower()

    if selected_agent == "research":
        return "research"

    if selected_agent == "code":
        return "code"

    if selected_agent == "writing":
        return "writing"

    return "analysis"


def route_after_review(state: AgentState) -> str:
    """
    Decides whether to finalize automatically or wait for human review.

    Logic:
    - If reviewer score is below threshold, go to human_review_node.
    - Otherwise, go to finalizer_node.
    """
    score = int(state.get("score", 0))
    threshold = settings.HUMAN_REVIEW_SCORE_THRESHOLD

    if score < threshold:
        return "human_review"

    return "finalizer"


def build_agent_graph():
    graph_builder = StateGraph(AgentState)

    graph_builder.add_node("memory_retriever", memory_retriever_node)
    graph_builder.add_node("supervisor", supervisor_node)
    graph_builder.add_node("tool_node", tool_node)

    graph_builder.add_node("research_agent", research_agent_node)
    graph_builder.add_node("code_agent", code_agent_node)
    graph_builder.add_node("writing_agent", writing_agent_node)
    graph_builder.add_node("analysis_agent", analysis_agent_node)

    graph_builder.add_node("reviewer", reviewer_node)
    graph_builder.add_node("human_review", human_review_node)
    graph_builder.add_node("finalizer", finalizer_node)

    graph_builder.add_edge(START, "memory_retriever")
    graph_builder.add_edge("memory_retriever", "supervisor")
    graph_builder.add_edge("supervisor", "tool_node")

    graph_builder.add_conditional_edges(
        "tool_node",
        route_to_specialist,
        {
            "research": "research_agent",
            "code": "code_agent",
            "writing": "writing_agent",
            "analysis": "analysis_agent",
        },
    )

    graph_builder.add_edge("research_agent", "reviewer")
    graph_builder.add_edge("code_agent", "reviewer")
    graph_builder.add_edge("writing_agent", "reviewer")
    graph_builder.add_edge("analysis_agent", "reviewer")

    graph_builder.add_conditional_edges(
        "reviewer",
        route_after_review,
        {
            "human_review": "human_review",
            "finalizer": "finalizer",
        },
    )

    graph_builder.add_edge("human_review", END)
    graph_builder.add_edge("finalizer", END)

    return graph_builder.compile()


agent_graph = build_agent_graph()


def run_agent_workflow(task: str) -> AgentState:
    initial_state: AgentState = {
        "task": task,

        "retrieved_memories": [],
        "memory_context": "No memory retrieved yet.",

        "selected_agent": "",
        "route_reason": "",
        "plan": "",

        "tool_name": "none",
        "tool_input": "",
        "tool_result": "",
        "tool_used": False,

        "execution_result": "",
        "review": "",
        "score": 0,
        "final_answer": "",

        "status": "RUNNING",
        "needs_human_review": False,
        "human_decision": None,
        "human_feedback": None,
        "reviewed_at": None,

        "trace": [],
    }

    result = agent_graph.invoke(initial_state)
    return result