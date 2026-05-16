import json
import re

from app.agents.agent_state import AgentState
from app.core.config import settings
from app.core.logging import get_logger
from app.services.llm_service import LLMService
from app.services.memory_service import build_memory_context
from app.tools.tool_registry import run_tool


logger = get_logger(__name__)

VALID_AGENTS = {"research", "code", "writing", "analysis"}
VALID_TOOLS = {
    "calculator",
    "text_stats",
    "keyword_extractor",
    "wikipedia_search",
    "arxiv_search",
    "none",
}

ARITHMETIC_EXPRESSION_PATTERN = re.compile(
    r"^\s*[-+()]?\d+(\.\d+)?(\s*[-+*/%]\s*[-+()]?\d+(\.\d+)?)+\s*$"
)


def _safe_score(text: str) -> int:
    matches = re.findall(r"\b(10|[1-9])\b", text)
    if not matches:
        return 7

    score = int(matches[0])
    return max(1, min(score, 10))


def _extract_json(text: str) -> dict:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return {}

    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return {}


def _fallback_agent_selection(task: str) -> str:
    task_lower = task.lower()

    code_keywords = [
        "code", "api", "backend", "frontend", "python", "fastapi",
        "react", "bug", "error", "function", "class", "database",
    ]
    writing_keywords = [
        "resume", "linkedin", "email", "cover letter", "caption",
        "message", "rewrite", "portfolio", "description",
    ]
    research_keywords = [
        "research", "latest", "study", "paper", "summarize",
        "explain", "compare", "advantages", "disadvantages",
    ]

    if any(keyword in task_lower for keyword in code_keywords):
        return "code"
    if any(keyword in task_lower for keyword in writing_keywords):
        return "writing"
    if any(keyword in task_lower for keyword in research_keywords):
        return "research"

    return "analysis"


def _fallback_tool_selection(task: str) -> str:
    task_lower = task.lower()

    writing_keywords = [
        "email", "follow-up", "follow up", "resume", "linkedin",
        "cover letter", "caption", "message", "rewrite", "post",
        "summary", "introduction",
    ]
    calculator_keywords = [
        "calculate", "calculation", "compute", "solve", "math",
        "percentage", "percent", "total", "sum", "difference",
        "multiply", "division", "divide",
    ]
    text_stats_keywords = [
        "word count", "count words", "characters", "sentence count",
        "how many words", "text stats",
    ]
    keyword_keywords = [
        "keywords", "extract keywords", "important terms", "ats keywords",
    ]
    wikipedia_keywords = [
        "wikipedia", "who is", "what is", "history of", "background of",
    ]
    arxiv_keywords = [
        "paper", "research", "study", "arxiv", "academic", "latest model",
    ]

    if any(keyword in task_lower for keyword in writing_keywords):
        return "none"
    if ARITHMETIC_EXPRESSION_PATTERN.match(task.strip()):
        return "calculator"
    if any(keyword in task_lower for keyword in calculator_keywords):
        return "calculator"
    if any(keyword in task_lower for keyword in text_stats_keywords):
        return "text_stats"
    if any(keyword in task_lower for keyword in keyword_keywords):
        return "keyword_extractor"
    if any(keyword in task_lower for keyword in arxiv_keywords):
        return "arxiv_search"
    if any(keyword in task_lower for keyword in wikipedia_keywords):
        return "wikipedia_search"

    return "none"


def _is_valid_calculator_input(value: str) -> bool:
    return bool(ARITHMETIC_EXPRESSION_PATTERN.match((value or "").strip()))


def _log_node(node: str, phase: str, state: AgentState, **extra) -> None:
    logger.info(
        f"{node} {phase}.",
        extra={
            "node": node,
            "run_id": state.get("run_id"),
            "workspace_id": state.get("workspace_id"),
            "tool_iterations": state.get("tool_iterations", 0),
            **extra,
        },
    )


def _tool_history_text(state: AgentState) -> str:
    history = state.get("tool_history", [])
    if not history:
        return "No tools have been executed yet."
    return "\n".join(f"- {item}" for item in history)


def memory_retriever_node(state: AgentState) -> AgentState:
    _log_node("memory_retriever", "started", state)
    memory_data = build_memory_context(
        state["task"],
        workspace_id=state["workspace_id"],
        limit=5,
    )

    trace = state.get("trace", [])
    retrieved_count = len(memory_data["retrieved_memories"])
    if retrieved_count == 0:
        trace.append("Memory Retriever found no relevant semantic memories.")
    else:
        trace.append(
            f"Memory Retriever found {retrieved_count} relevant semantic memories."
        )

    updated_state = {
        **state,
        "retrieved_memories": memory_data["retrieved_memories"],
        "memory_context": memory_data["memory_context"],
        "trace": trace,
    }
    _log_node("memory_retriever", "completed", updated_state)
    return updated_state


def supervisor_node(state: AgentState) -> AgentState:
    _log_node("supervisor", "started", state)
    llm = LLMService(role="supervisor")

    system_prompt = f"""
You are the Supervisor Agent in AgentFlow.

Your job:
1. Understand the user's task.
2. Select exactly one specialist agent.
3. Decide whether another backend tool is needed right now.
4. Create or refine the execution plan.

Available specialist agents:
- research
- code
- writing
- analysis

Available tools:
- calculator
- text_stats
- keyword_extractor
- wikipedia_search
- arxiv_search
- none

Tool loop policy:
- The workflow may call tools multiple times.
- A maximum of {settings.AGENT_MAX_TOOL_ITERATIONS} tool iterations is allowed.
- If existing tool results are already enough, return "none".
- Do not repeat the same tool unless the new input is meaningfully different.

Return ONLY valid JSON in this exact format:
{{
  "selected_agent": "research | code | writing | analysis",
  "route_reason": "short reason why this agent is best",
  "tool_name": "calculator | text_stats | keyword_extractor | wikipedia_search | arxiv_search | none",
  "tool_input": "exact input for the tool, or empty string if no tool is needed",
  "plan": "numbered execution plan"
}}
"""

    user_prompt = f"""
User task:
{state["task"]}

Memory context:
{state["memory_context"]}

Tools already executed:
{_tool_history_text(state)}

Current tool iterations:
{state.get("tool_iterations", 0)}

Choose the best specialist agent, decide if another tool is needed, and create the plan.
Use memory context only if it is relevant.
"""

    raw_response = llm.generate_response(user_prompt, system_prompt)
    parsed = _extract_json(raw_response)

    selected_agent = parsed.get("selected_agent", "").strip().lower()
    route_reason = parsed.get("route_reason", "").strip()
    tool_name = parsed.get("tool_name", "").strip().lower()
    tool_input = parsed.get("tool_input", "").strip()
    plan = parsed.get("plan", "").strip()

    if selected_agent not in VALID_AGENTS:
        selected_agent = state.get("selected_agent") or _fallback_agent_selection(state["task"])
        route_reason = route_reason or "Fallback agent routing was used."

    if tool_name not in VALID_TOOLS:
        tool_name = _fallback_tool_selection(state["task"])

    if tool_name == "calculator" and not _is_valid_calculator_input(tool_input):
        fallback_tool = _fallback_tool_selection(state["task"])
        tool_name = fallback_tool if fallback_tool != "calculator" else "none"
        tool_input = state["task"] if tool_name != "none" else ""
        route_reason = (
            f"{route_reason} Calculator was skipped because the task is not arithmetic."
        ).strip()

    if state.get("tool_iterations", 0) >= settings.AGENT_MAX_TOOL_ITERATIONS:
        tool_name = "none"
        route_reason = (
            f"{route_reason} Tool loop stopped after reaching max iterations."
        ).strip()

    if tool_name != "none" and not tool_input:
        tool_input = state["task"]

    if not plan:
        plan = (
            "1. Understand the user task clearly.\n"
            "2. Use tools when needed.\n"
            "3. Produce a structured and useful response.\n"
            "4. Review and refine the final answer."
        )

    trace = state.get("trace", [])
    trace.append(
        f"Supervisor selected '{selected_agent}' agent and '{tool_name}' tool on iteration {state.get('tool_iterations', 0)}."
    )

    updated_state = {
        **state,
        "selected_agent": selected_agent,
        "route_reason": route_reason,
        "tool_name": tool_name if tool_name != "none" or not state.get("tool_used") else state.get("tool_name", "none"),
        "tool_input": tool_input if tool_name != "none" or not state.get("tool_used") else state.get("tool_input", ""),
        "plan": plan,
        "should_use_tool": tool_name != "none",
        "trace": trace,
    }
    _log_node(
        "supervisor",
        "completed",
        updated_state,
        tool_name=tool_name,
    )
    return updated_state


def tool_node(state: AgentState) -> AgentState:
    _log_node("tool_node", "started", state, tool_name=state.get("tool_name"))
    tool_name = state.get("tool_name", "none")
    trace = state.get("trace", [])
    tool_history = state.get("tool_history", [])

    if tool_name == "none":
        trace.append("Tool Node skipped because no tool was needed.")
        updated_state = {
            **state,
            "tool_used": False,
            "should_use_tool": False,
            "tool_result": "No tool was used for this task.",
            "trace": trace,
        }
        _log_node("tool_node", "completed", updated_state, tool_name="none")
        return updated_state

    if tool_name == "calculator" and not _is_valid_calculator_input(state.get("tool_input", "")):
        trace.append("Tool Node skipped calculator because the input was not arithmetic.")
        return {
            **state,
            "tool_name": "none",
            "tool_input": "",
            "tool_result": "No tool was used for this task.",
            "tool_used": False,
            "should_use_tool": False,
            "trace": trace,
        }

    result = run_tool(tool_name, state.get("tool_input", ""))
    tool_history.append(
        f"{tool_name}('{state.get('tool_input', '')[:120]}') -> {result['result'][:220]}"
    )
    trace.append(
        f"Tool Node executed '{tool_name}'. Tool used: {result['tool_used']}."
    )

    updated_state = {
        **state,
        "tool_used": result["tool_used"],
        "tool_result": result["result"],
        "should_use_tool": False,
        "tool_iterations": state.get("tool_iterations", 0) + (1 if result["tool_used"] else 0),
        "tool_history": tool_history,
        "trace": trace,
    }
    _log_node(
        "tool_node",
        "completed",
        updated_state,
        tool_name=tool_name,
    )
    return updated_state


def _build_specialist_prompt(state: AgentState, specialist_type: str) -> str:
    return f"""
Original user task:
{state["task"]}

Memory context:
{state["memory_context"]}

Supervisor plan:
{state["plan"]}

Latest tool selected:
{state["tool_name"]}

Latest tool result:
{state["tool_result"]}

Tool history:
{_tool_history_text(state)}

Now complete this task as a {specialist_type}-focused agent.
Use memory context only if relevant.
Use tool results when they improve accuracy.
"""


def research_agent_node(state: AgentState) -> AgentState:
    _log_node("research_agent", "started", state)
    llm = LLMService(role="specialist")

    system_prompt = """
You are the Research Agent in AgentFlow.

Your job:
1. Explain concepts clearly.
2. Compare options when needed.
3. Summarize information in a structured way.
4. Keep the answer practical and useful.
5. Be honest when live research is still needed.
"""

    output = llm.generate_response(
        _build_specialist_prompt(state, "research"),
        system_prompt,
    )

    trace = state.get("trace", [])
    trace.append("Research Agent completed the task.")
    updated_state = {
        **state,
        "execution_result": output,
        "trace": trace,
    }
    _log_node("research_agent", "completed", updated_state)
    return updated_state


def code_agent_node(state: AgentState) -> AgentState:
    _log_node("code_agent", "started", state)
    llm = LLMService(role="specialist")

    system_prompt = """
You are the Code Agent in AgentFlow.

Your job:
1. Write clean and practical code.
2. Explain implementation steps clearly.
3. Mention folder/file placement when needed.
4. Include error handling where useful.
5. Prefer production-ready structure over toy examples.
6. Do not invent files that are not needed.
"""

    output = llm.generate_response(
        _build_specialist_prompt(state, "coding"),
        system_prompt,
    )

    trace = state.get("trace", [])
    trace.append("Code Agent completed the task.")
    updated_state = {
        **state,
        "execution_result": output,
        "trace": trace,
    }
    _log_node("code_agent", "completed", updated_state)
    return updated_state


def writing_agent_node(state: AgentState) -> AgentState:
    _log_node("writing_agent", "started", state)
    llm = LLMService(role="specialist")

    system_prompt = """
You are the Writing Agent in AgentFlow.

Your job:
1. Write in simple, professional, human language.
2. Avoid buzzwords and over-polished wording.
3. Make the output practical and ready to use.
4. For resume/project content, use strong action + impact structure.
5. Keep wording natural and recruiter-friendly.
"""

    output = llm.generate_response(
        _build_specialist_prompt(state, "writing"),
        system_prompt,
    )

    trace = state.get("trace", [])
    trace.append("Writing Agent completed the task.")
    updated_state = {
        **state,
        "execution_result": output,
        "trace": trace,
    }
    _log_node("writing_agent", "completed", updated_state)
    return updated_state


def analysis_agent_node(state: AgentState) -> AgentState:
    _log_node("analysis_agent", "started", state)
    llm = LLMService(role="specialist")

    system_prompt = """
You are the Analysis Agent in AgentFlow.

Your job:
1. Break down the problem clearly.
2. Compare possible options.
3. Give practical recommendations.
4. Explain trade-offs.
5. End with a clear suggested next action.
"""

    output = llm.generate_response(
        _build_specialist_prompt(state, "analysis"),
        system_prompt,
    )

    trace = state.get("trace", [])
    trace.append("Analysis Agent completed the task.")
    updated_state = {
        **state,
        "execution_result": output,
        "trace": trace,
    }
    _log_node("analysis_agent", "completed", updated_state)
    return updated_state


def reviewer_node(state: AgentState) -> AgentState:
    _log_node("reviewer", "started", state)
    llm = LLMService(role="reviewer")

    system_prompt = """
You are the Reviewer Agent in AgentFlow.

Your job:
1. Review whether the output satisfies the user's original task.
2. Check clarity, completeness, correctness, and usefulness.
3. Give a score from 1 to 10.
4. Mention specific improvements if needed.

Important:
Start your response with this exact format:
Score: <number>/10

Then write the review.
"""

    user_prompt = f"""
Original user task:
{state["task"]}

Memory context:
{state["memory_context"]}

Selected specialist agent:
{state["selected_agent"]}

Supervisor route reason:
{state["route_reason"]}

Supervisor plan:
{state["plan"]}

Tool history:
{_tool_history_text(state)}

Specialist output:
{state["execution_result"]}

Review this output.
"""

    review = llm.generate_response(user_prompt, system_prompt)
    score = _safe_score(review)

    trace = state.get("trace", [])
    trace.append(f"Reviewer Agent reviewed output and assigned score {score}/10.")

    updated_state = {
        **state,
        "review": review,
        "score": score,
        "trace": trace,
    }
    _log_node("reviewer", "completed", updated_state, status=updated_state.get("status"))
    return updated_state


def human_review_node(state: AgentState) -> AgentState:
    _log_node("human_review", "started", state)
    trace = state.get("trace", [])
    trace.append(
        "Human Review Node paused the workflow because reviewer score was below threshold."
    )

    updated_state = {
        **state,
        "status": "NEEDS_HUMAN_REVIEW",
        "needs_human_review": True,
        "final_answer": (
            "This run needs human review before finalization. "
            "Please approve, revise, or reject it from the human review endpoint."
        ),
        "trace": trace,
    }
    _log_node("human_review", "completed", updated_state, status="NEEDS_HUMAN_REVIEW")
    return updated_state


def finalizer_node(state: AgentState) -> AgentState:
    _log_node("finalizer", "started", state)
    llm = LLMService(role="specialist")

    system_prompt = """
You are the Finalizer Agent in AgentFlow.

Your job:
1. Read the specialist output and reviewer feedback.
2. Improve the final answer if reviewer suggested useful changes.
3. Return a polished final answer.
4. Do not include hidden reasoning or internal chain-of-thought.
5. Keep the answer directly useful to the user.
"""

    user_prompt = f"""
Original user task:
{state["task"]}

Memory context:
{state["memory_context"]}

Selected specialist agent:
{state["selected_agent"]}

Tool history:
{_tool_history_text(state)}

Specialist output:
{state["execution_result"]}

Reviewer feedback:
{state["review"]}

Reviewer score:
{state["score"]}/10

Create the final polished response.
Use memory context only if relevant.
"""

    final_answer = llm.generate_response(user_prompt, system_prompt)

    trace = state.get("trace", [])
    trace.append("Finalizer Agent produced the final polished answer.")
    updated_state = {
        **state,
        "final_answer": final_answer,
        "status": "COMPLETED",
        "needs_human_review": False,
        "trace": trace,
    }
    _log_node("finalizer", "completed", updated_state, status="COMPLETED")
    return updated_state
