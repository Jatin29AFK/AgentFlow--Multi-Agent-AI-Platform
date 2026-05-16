import json
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.db.database import get_connection
from app.services.embedding_service import cosine_similarity, embed_text


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

    embedding_json = data.get("embedding_json")
    try:
        data["embedding"] = json.loads(embedding_json) if embedding_json else None
    except json.JSONDecodeError:
        data["embedding"] = None

    data.pop("tags_json", None)
    data.pop("embedding_json", None)
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
    normalized_content = content.strip()
    importance = max(1, min(int(importance), 5))

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT *
        FROM agent_memories
        WHERE workspace_id = ? AND lower(content) = lower(?)
        LIMIT 1
        """,
        (workspace_id, normalized_content),
    )

    existing_row = cursor.fetchone()
    if existing_row is not None:
        connection.close()
        existing_memory = _row_to_memory(existing_row)
        existing_memory.pop("embedding", None)
        return existing_memory

    embedding = embed_text(normalized_content)

    if embedding:
        cursor.execute(
            """
            SELECT *
            FROM agent_memories
            WHERE workspace_id = ? AND embedding_json IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 100
            """,
            (workspace_id,),
        )

        for row in cursor.fetchall():
            existing_memory = _row_to_memory(row)
            existing_embedding = existing_memory.get("embedding")
            if not existing_embedding:
                continue

            if cosine_similarity(embedding, existing_embedding) >= 0.92:
                connection.close()
                existing_memory.pop("embedding", None)
                return existing_memory

    cursor.execute(
        """
        INSERT INTO agent_memories (
            id,
            workspace_id,
            content,
            source_run_id,
            tags_json,
            importance,
            embedding_json,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            memory_id,
            workspace_id,
            normalized_content,
            source_run_id,
            json.dumps(tags),
            importance,
            json.dumps(embedding) if embedding else None,
            created_at,
            updated_at,
        ),
    )

    connection.commit()
    connection.close()

    return {
        "id": memory_id,
        "workspace_id": workspace_id,
        "content": normalized_content,
        "source_run_id": source_run_id,
        "tags": tags,
        "importance": importance,
        "embedding": embedding,
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
    Semantic-first memory search using locally stored embeddings.
    Falls back to lexical overlap if embeddings are unavailable.
    """
    all_memories = list_memories(workspace_id=workspace_id, limit=500)
    query_tokens = _tokenize(query)
    query_embedding = embed_text(query)

    scored_memories = []

    for memory in all_memories:
        memory_tokens = _tokenize(memory["content"])
        overlap = query_tokens.intersection(memory_tokens)
        lexical_score = (
            float(len(overlap)) / float(max(len(query_tokens), 1))
            if query_tokens
            else 0.0
        )

        semantic_score = 0.0
        if query_embedding and memory.get("embedding"):
            semantic_score = cosine_similarity(query_embedding, memory["embedding"])

        if semantic_score <= 0 and lexical_score <= 0:
            continue

        importance_bonus = float(memory.get("importance", 3)) / 10.0
        score = semantic_score + lexical_score + importance_bonus

        scored_memories.append(
            {
                **memory,
                "search_score": round(score, 4),
                "semantic_score": round(semantic_score, 4),
                "matched_terms": sorted(list(overlap)),
            }
        )

    scored_memories.sort(
        key=lambda item: item["search_score"],
        reverse=True,
    )

    top_results = scored_memories[:limit]

    for memory in top_results:
        memory.pop("embedding", None)

    return top_results
