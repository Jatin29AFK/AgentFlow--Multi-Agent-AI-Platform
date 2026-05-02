import json
import re
from typing import Any, Dict, List

from app.repositories.memory_repository import create_memory, search_memories
from app.services.llm_service import LLMService


def build_memory_context(task: str, limit: int = 5) -> Dict[str, Any]:
    """
    Searches relevant memories for a task and formats them for agent prompts.
    """
    memories = search_memories(task, limit=limit)

    if not memories:
        return {
            "retrieved_memories": [],
            "memory_context": "No relevant long-term memory found for this task.",
        }

    memory_lines = []

    for index, memory in enumerate(memories, start=1):
        memory_lines.append(f"{index}. {memory['content']}")

    memory_context = "Relevant long-term memories:\n" + "\n".join(memory_lines)

    return {
        "retrieved_memories": [memory["content"] for memory in memories],
        "memory_context": memory_context,
    }


def _extract_json_list(text: str) -> List[Dict[str, Any]]:
    """
    Extracts JSON list from LLM output.

    Expected format:
    [
      {
        "content": "...",
        "tags": ["..."],
        "importance": 3
      }
    ]
    """
    try:
        parsed = json.loads(text)
        if isinstance(parsed, list):
            return parsed
    except json.JSONDecodeError:
        pass

    match = re.search(r"\[.*\]", text, re.DOTALL)
    if not match:
        return []

    try:
        parsed = json.loads(match.group(0))
        if isinstance(parsed, list):
            return parsed
    except json.JSONDecodeError:
        return []

    return []


def extract_and_save_memories_from_run(
    run: Dict[str, Any],
    run_id: str,
) -> List[Dict[str, Any]]:
    """
    Uses LLM to extract useful long-term memories from a completed run.
    Saves them into SQLite.
    """
    if run.get("status") != "COMPLETED":
        return []

    llm = LLMService()

    system_prompt = """
You are the Memory Extraction Agent in AgentFlow.

Your job:
Extract only useful long-term memories from the completed agent run.

Save memories only if they will help future tasks.

Good memories:
- User preferences
- Project names and project details
- Technical stack being used
- Repeated writing/style preferences
- Important long-term facts about the user's work

Do NOT save:
- API keys
- passwords
- private secrets
- one-time calculations
- temporary instructions
- random text that will not be useful later
- sensitive personal information

Return ONLY valid JSON list.

Format:
[
  {
    "content": "short memory sentence",
    "tags": ["tag1", "tag2"],
    "importance": 1
  }
]

Importance:
1 = low importance
3 = normal importance
5 = very important
"""

    user_prompt = f"""
Completed agent run:

Task:
{run.get("task", "")}

Selected agent:
{run.get("selected_agent", "")}

Tool used:
{run.get("tool_name", "")}

Final answer:
{run.get("final_answer", "")}

Human feedback:
{run.get("human_feedback", "")}

Extract useful long-term memories from this run.
If there is nothing worth remembering, return [].
"""

    raw_response = llm.generate_response(user_prompt, system_prompt)
    memory_candidates = _extract_json_list(raw_response)

    saved_memories = []

    for item in memory_candidates:
        content = str(item.get("content", "")).strip()

        if not content:
            continue

        tags = item.get("tags", [])
        if not isinstance(tags, list):
            tags = []

        importance = item.get("importance", 3)

        saved_memory = create_memory(
            content=content,
            source_run_id=run_id,
            tags=tags,
            importance=importance,
        )

        saved_memories.append(saved_memory)

    return saved_memories