import json
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.db.database import get_connection


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_memory(row) -> Dict[str, Any]:
    """
    Converts SQLite row into normal dictionary.
    Also converts tags JSON string into Python list.
    """
    data = dict(row)

    tags_json = data.get("tags_json") or "[]"
    try:
        data["tags"] = json.loads(tags_json)
    except json.JSONDecodeError:
        data["tags"] = []

    data.pop("tags_json", None)
    return data


def create_memory(
    workspace_id: str,
    content: str,
    source_run_id: Optional[str] = None,
    tags: Optional[List[str]] = None,
    importance: int = 3,
) -> Dict[str, Any]:
    """
    Saves a new memory into SQLite.
    """
    memory_id = str(uuid.uuid4())
    created_at = _now()
    updated_at = created_at

    tags = tags or []
    importance = max(1, min(int(importance), 5))

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT INTO agent_memories (
            id,
            workspace_id,
            content,
            source_run_id,
            tags_json,
            importance,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            memory_id,
            workspace_id,
            content.strip(),
            source_run_id,
            json.dumps(tags),
            importance,
            created_at,
            updated_at,
        ),
    )

    connection.commit()
    connection.close()

    return {
        "id": memory_id,
        "workspace_id": workspace_id,
        "content": content.strip(),
        "source_run_id": source_run_id,
        "tags": tags,
        "importance": importance,
        "created_at": created_at,
        "updated_at": updated_at,
    }


def list_memories(workspace_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    """
    Returns latest memories.
    """
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT *
        FROM agent_memories
        WHERE workspace_id = ?
        ORDER BY created_at DESC
        LIMIT ?
        """,
        (workspace_id, limit),
    )

    rows = cursor.fetchall()
    connection.close()

    return [_row_to_memory(row) for row in rows]


def get_memory_by_id(memory_id: str, workspace_id: str) -> Optional[Dict[str, Any]]:
    """
    Returns one memory by ID.
    """
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT *
        FROM agent_memories
        WHERE id = ? AND workspace_id = ?
        """,
        (memory_id, workspace_id),
    )

    row = cursor.fetchone()
    connection.close()

    if row is None:
        return None

    return _row_to_memory(row)


def delete_memory(memory_id: str, workspace_id: str) -> bool:
    """
    Deletes one memory by ID.
    """
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        DELETE FROM agent_memories
        WHERE id = ? AND workspace_id = ?
        """,
        (memory_id, workspace_id),
    )

    deleted = cursor.rowcount > 0

    connection.commit()
    connection.close()

    return deleted


def _tokenize(text: str) -> set:
    """
    Converts text into searchable words.

    Example:
    'Build AgentFlow using FastAPI'
    becomes:
    {'build', 'agentflow', 'using', 'fastapi'}
    """
    return set(
        token.lower()
        for token in re.findall(r"\b[a-zA-Z][a-zA-Z0-9+-]*\b", text)
        if len(token) > 2
    )


def search_memories(
    query: str,
    workspace_id: str,
    limit: int = 5,
) -> List[Dict[str, Any]]:
    """
    Simple keyword-based memory search.

    This is not vector search yet.
    It checks word overlap between query and memory content.
    """
    all_memories = list_memories(workspace_id=workspace_id, limit=500)
    query_tokens = _tokenize(query)

    scored_memories = []

    for memory in all_memories:
        memory_tokens = _tokenize(memory["content"])
        overlap = query_tokens.intersection(memory_tokens)

        if not overlap:
            continue

        score = len(overlap) + int(memory.get("importance", 3))

        scored_memories.append(
            {
                **memory,
                "search_score": score,
                "matched_terms": sorted(list(overlap)),
            }
        )

    scored_memories.sort(
        key=lambda item: item["search_score"],
        reverse=True,
    )

    return scored_memories[:limit]
