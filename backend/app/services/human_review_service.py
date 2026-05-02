from typing import Dict, Any

from app.services.llm_service import LLMService


def generate_revised_answer_with_human_feedback(
    run: Dict[str, Any],
    human_feedback: str,
) -> str:
    """
    Uses LLM to revise the specialist output based on human feedback.

    Example:
    Human says: Make it shorter and more professional.
    This function asks the LLM to create improved final answer.
    """
    llm = LLMService()

    system_prompt = """
You are the Human Review Revision Agent in AgentFlow.

Your job:
1. Read the original task.
2. Read the specialist output.
3. Read the reviewer feedback.
4. Read the human feedback.
5. Produce a better final answer.

Rules:
- Follow the human feedback carefully.
- Keep the final answer clear and useful.
- Do not mention internal workflow unless needed.
- Do not include hidden reasoning.
"""

    user_prompt = f"""
Original user task:
{run["task"]}

Selected specialist agent:
{run["selected_agent"]}

Specialist output:
{run["execution_result"]}

Reviewer feedback:
{run["review"]}

Reviewer score:
{run["score"]}/10

Human feedback:
{human_feedback}

Now create the revised final answer.
"""

    return llm.generate_response(user_prompt, system_prompt)