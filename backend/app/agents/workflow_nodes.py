import json
import re

from app.agents.agent_state import AgentState
from app.services.llm_service import LLMService
from app.tools.tool_registry import run_tool

from app.services.memory_service import build_memory_context


VALID_AGENTS = {"research", "code", "writing", "analysis"}
VALID_TOOLS = {"calculator", "text_stats", "keyword_extractor", "none"}


def _safe_score(text: str) -> int:
    """
    Extracts first score between 1 and 10 from reviewer response.
    If no score is found, return 7 as neutral default.
    """
    matches = re.findall(r"\b(10|[1-9])\b", text)
    if not matches:
        return 7

    score = int(matches[0])
    return max(1, min(score, 10))


def _extract_json(text: str) -> dict:
    """
    Extract JSON from LLM output.

    Sometimes LLM may return:
    Here is the JSON:
    { ... }

    This function tries to still extract the JSON part safely.
    """
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
    """
    If Supervisor fails to return valid JSON,
    this function chooses an agent using simple keyword rules.
    """
    task_lower = task.lower()

    code_keywords = [
        "code", "api", "backend", "frontend", "python", "fastapi",
        "react", "bug", "error", "function", "class", "database"
    ]

    writing_keywords = [
        "resume", "linkedin", "email", "cover letter", "caption",
        "message", "rewrite", "portfolio", "description"
    ]

    research_keywords = [
        "research", "latest", "study", "paper", "summarize",
        "explain", "compare", "advantages", "disadvantages"
    ]

    if any(keyword in task_lower for keyword in code_keywords):
        return "code"

    if any(keyword in task_lower for keyword in writing_keywords):
        return "writing"

    if any(keyword in task_lower for keyword in research_keywords):
        return "research"

    return "analysis"


def _fallback_tool_selection(task: str) -> str:
    """
    If Supervisor fails to choose a valid tool,
    this function selects tool using simple keyword rules.
    """
    task_lower = task.lower()

    calculator_keywords = [
        "calculate", "calculation", "compute", "solve", "+", "-", "*", "/", "%"
    ]

    text_stats_keywords = [
        "word count", "count words", "characters", "sentence count",
        "how many words", "text stats"
    ]

    keyword_keywords = [
        "keywords", "extract keywords", "important terms", "ats keywords"
    ]

    if any(keyword in task_lower for keyword in calculator_keywords):
        return "calculator"

    if any(keyword in task_lower for keyword in text_stats_keywords):
        return "text_stats"

    if any(keyword in task_lower for keyword in keyword_keywords):
        return "keyword_extractor"

    return "none"


def memory_retriever_node(state: AgentState) -> AgentState:
    """
    Memory Retriever Node:
    Searches long-term memory before the supervisor starts planning.

    Why this exists:
    - The supervisor should know useful past context.
    - Specialist agents should also use relevant memory.
    - This makes AgentFlow more personalized and consistent.
    """
    memory_data = build_memory_context(state["task"], limit=5)

    trace = state.get("trace", [])

    retrieved_count = len(memory_data["retrieved_memories"])

    if retrieved_count == 0:
        trace.append("Memory Retriever found no relevant long-term memories.")
    else:
        trace.append(
            f"Memory Retriever found {retrieved_count} relevant long-term memories."
        )

    return {
        **state,
        "retrieved_memories": memory_data["retrieved_memories"],
        "memory_context": memory_data["memory_context"],
        "trace": trace,
    }

def supervisor_node(state: AgentState) -> AgentState:
    """
    Supervisor Agent:
    - Understands the user task
    - Selects one specialist agent
    - Selects one optional tool
    - Creates execution plan
    """
    llm = LLMService()

    system_prompt = """
You are the Supervisor Agent in AgentFlow.

Your job:
1. Understand the user's task.
2. Select exactly one specialist agent.
3. Decide whether a backend tool is needed.
4. Create a practical execution plan.

Available specialist agents:

1. research
Use for explanation, comparison, summarization, research-style tasks, concept understanding.

2. code
Use for coding, debugging, architecture, implementation, API, database, frontend/backend tasks.

3. writing
Use for resume bullets, emails, LinkedIn posts, captions, documentation, professional writing.

4. analysis
Use for decision-making, recommendations, trade-off analysis, problem breakdown.

Available tools:

1. calculator
Use only for arithmetic calculation.

2. text_stats
Use for word count, character count, sentence count, and line count.

3. keyword_extractor
Use to extract important keywords from text.

4. none
Use when no tool is needed.

Return ONLY valid JSON in this exact format:

{
  "selected_agent": "research | code | writing | analysis",
  "route_reason": "short reason why this agent is best",
  "tool_name": "calculator | text_stats | keyword_extractor | none",
  "tool_input": "exact input for the tool, or empty string if no tool is needed",
  "plan": "numbered execution plan"
}
"""

    user_prompt = f"""
User task:
{state["task"]}

Memory context:
{state["memory_context"]}

Choose the best specialist agent, decide if a tool is needed, and create the plan.
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
        selected_agent = _fallback_agent_selection(state["task"])
        route_reason = "Fallback agent routing was used."

    if tool_name not in VALID_TOOLS:
        tool_name = _fallback_tool_selection(state["task"])

    if tool_name != "none" and not tool_input:
        tool_input = state["task"]

    if not plan:
        plan = (
            "1. Understand the user task clearly.\n"
            "2. Use a tool if required.\n"
            "3. Produce a structured and useful response.\n"
            "4. Review and refine the final answer."
        )

    trace = state.get("trace", [])
    trace.append(
        f"Supervisor selected '{selected_agent}' agent and '{tool_name}' tool."
    )

    return {
        **state,
        "selected_agent": selected_agent,
        "route_reason": route_reason,
        "tool_name": tool_name,
        "tool_input": tool_input,
        "plan": plan,
        "trace": trace,
    }


def tool_node(state: AgentState) -> AgentState:
    """
    Tool Node:
    Runs selected backend tool before specialist agent.
    """
    tool_name = state.get("tool_name", "none")
    trace = state.get("trace", [])

    if tool_name == "none":
        trace.append("Tool Node skipped because no tool was needed.")
        return {
            **state,
            "tool_used": False,
            "tool_result": "No tool was used for this task.",
            "trace": trace,
        }

    result = run_tool(tool_name, state.get("tool_input", ""))

    trace.append(
        f"Tool Node executed '{tool_name}'. Tool used: {result['tool_used']}."
    )

    return {
        **state,
        "tool_used": result["tool_used"],
        "tool_result": result["result"],
        "trace": trace,
    }


def _build_specialist_prompt(state: AgentState, specialist_type: str) -> str:
    """
    Common prompt builder for all specialist agents.

    This includes:
    - Original task
    - Relevant long-term memory
    - Supervisor plan
    - Tool result

    Specialist agents can now answer with more context.
    """
    return f"""
Original user task:
{state["task"]}

Memory context:
{state["memory_context"]}

Supervisor plan:
{state["plan"]}

Tool selected:
{state["tool_name"]}

Tool result:
{state["tool_result"]}

Now complete this task as a {specialist_type}-focused agent.
Use the memory context only if relevant.
Use the tool result if it is useful.
"""

def research_agent_node(state: AgentState) -> AgentState:
    llm = LLMService()

    system_prompt = """
You are the Research Agent in AgentFlow.

Your job:
1. Explain concepts clearly.
2. Compare options when needed.
3. Summarize information in a structured way.
4. Keep the answer practical and useful.
5. Be honest when live web research would be required.

Do not claim live internet access.
"""

    output = llm.generate_response(
        _build_specialist_prompt(state, "research"),
        system_prompt,
    )

    trace = state.get("trace", [])
    trace.append("Research Agent completed the task.")

    return {
        **state,
        "execution_result": output,
        "trace": trace,
    }


def code_agent_node(state: AgentState) -> AgentState:
    llm = LLMService()

    system_prompt = """
You are the Code Agent in AgentFlow.

Your job:
1. Write clean and practical code.
2. Explain implementation steps clearly.
3. Mention folder/file placement when needed.
4. Include error handling where useful.
5. Prefer production-ready structure over toy examples.
6. Do not invent files that are not needed.

Use simple explanations for beginners.
"""

    output = llm.generate_response(
        _build_specialist_prompt(state, "coding"),
        system_prompt,
    )

    trace = state.get("trace", [])
    trace.append("Code Agent completed the task.")

    return {
        **state,
        "execution_result": output,
        "trace": trace,
    }


def writing_agent_node(state: AgentState) -> AgentState:
    llm = LLMService()

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

    return {
        **state,
        "execution_result": output,
        "trace": trace,
    }


def analysis_agent_node(state: AgentState) -> AgentState:
    llm = LLMService()

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

    return {
        **state,
        "execution_result": output,
        "trace": trace,
    }


def reviewer_node(state: AgentState) -> AgentState:
    """
    Reviewer Agent:
    Reviews specialist output and assigns a score.
    This score decides whether human review is needed.
    """
    llm = LLMService()

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

Tool used:
{state["tool_used"]}

Tool name:
{state["tool_name"]}

Tool result:
{state["tool_result"]}

Specialist output:
{state["execution_result"]}

Review this output.
"""

    review = llm.generate_response(user_prompt, system_prompt)
    score = _safe_score(review)

    trace = state.get("trace", [])
    trace.append(f"Reviewer Agent reviewed output and assigned score {score}/10.")

    return {
        **state,
        "review": review,
        "score": score,
        "trace": trace,
    }


def human_review_node(state: AgentState) -> AgentState:
    """
    Human Review Node:
    This node does not create final answer.
    It marks the run as needing human review.

    Later, a human can approve, revise, or reject using API.
    """
    trace = state.get("trace", [])
    trace.append(
        "Human Review Node paused the workflow because reviewer score was below threshold."
    )

    return {
        **state,
        "status": "NEEDS_HUMAN_REVIEW",
        "needs_human_review": True,
        "final_answer": (
            "This run needs human review before finalization. "
            "Please approve, revise, or reject it from the human review endpoint."
        ),
        "trace": trace,
    }


def finalizer_node(state: AgentState) -> AgentState:
    """
    Finalizer Agent:
    Creates final answer only when review score is good enough.
    """
    llm = LLMService()

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

Tool used:
{state["tool_used"]}

Tool result:
{state["tool_result"]}

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

    return {
        **state,
        "final_answer": final_answer,
        "status": "COMPLETED",
        "needs_human_review": False,
        "trace": trace,
    }