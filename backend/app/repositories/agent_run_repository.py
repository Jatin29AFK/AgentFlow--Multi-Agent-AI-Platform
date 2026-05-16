import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.db.database import get_connection


def _row_to_dict(row) -> Dict[str, Any]:
    """
    Converts SQLite row into normal Python dictionary.
    Also converts trace JSON back into list.
    """
    data = dict(row)

    data["tool_used"] = bool(data.get("tool_used", 0))
    data["needs_human_review"] = bool(data.get("needs_human_review", 0))

    trace_json = data.get("trace_json") or "[]"
    try:
        data["trace"] = json.loads(trace_json)
    except json.JSONDecodeError:
        data["trace"] = []

    memories_json = data.get("retrieved_memories_json") or "[]"
    try:
        data["retrieved_memories"] = json.loads(memories_json)
    except json.JSONDecodeError:
        data["retrieved_memories"] = []

    data.pop("retrieved_memories_json", None)

    data.pop("trace_json", None)
    return data

def save_agent_run(result: Dict[str, Any], workspace_id: str) -> Dict[str, str]:
    """
    Saves one full agent workflow run into SQLite.
    Returns run_id and created_at.
    """
    run_id = result.get("run_id") or str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()

    trace = result.get("trace", [])
    retrieved_memories = result.get("retrieved_memories", [])

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        INSERT INTO agent_runs (
            id,
            workspace_id,
            task,
            retrieved_memories_json,
            memory_context,
            selected_agent,
            route_reason,
            plan,
            tool_name,
            tool_input,
            tool_result,
            tool_used,
            execution_result,
            review,
            score,
            final_answer,
            status,
            needs_human_review,
            human_decision,
            human_feedback,
            reviewed_at,
            trace_json,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            run_id,
            workspace_id,
            result.get("task", ""),
            json.dumps(retrieved_memories),
            result.get("memory_context", ""),

            result.get("selected_agent", ""),
            result.get("route_reason", ""),
            result.get("plan", ""),
            result.get("tool_name", "none"),
            result.get("tool_input", ""),
            result.get("tool_result", ""),
            1 if result.get("tool_used", False) else 0,
            result.get("execution_result", ""),
            result.get("review", ""),
            int(result.get("score", 0)),
            result.get("final_answer", ""),

            result.get("status", "COMPLETED"),
            1 if result.get("needs_human_review", False) else 0,
            result.get("human_decision"),
            result.get("human_feedback"),
            result.get("reviewed_at"),

            json.dumps(trace),
            created_at,
        ),
    )

    connection.commit()
    connection.close()

    return {
        "run_id": run_id,
        "created_at": created_at,
    }

def list_agent_runs(
    workspace_id: str,
    limit: int = 20,
    offset: int = 0,
    query: str = "",
    status: str = "all",
) -> List[Dict[str, Any]]:
    """
    Returns recent agent runs.
    Only returns summary-level fields.
    """
    connection = get_connection()
    cursor = connection.cursor()

    filters = ["workspace_id = ?"]
    params: list[Any] = [workspace_id]

    normalized_query = query.strip()
    if normalized_query:
        filters.append(
            """
            (
                task LIKE ?
                OR selected_agent LIKE ?
                OR tool_name LIKE ?
                OR status LIKE ?
                OR final_answer LIKE ?
            )
            """
        )
        like_query = f"%{normalized_query}%"
        params.extend([like_query, like_query, like_query, like_query, like_query])

    if status.strip() and status != "all":
        filters.append("status = ?")
        params.append(status)

    params.extend([limit, offset])

    cursor.execute(
        f"""
        SELECT
            id,
            task,
            selected_agent,
            tool_name,
            tool_used,
            score,
            status,
            needs_human_review,
            created_at
        FROM agent_runs
        WHERE {" AND ".join(filters)}
        ORDER BY created_at DESC
        LIMIT ?
        OFFSET ?
        """,
        params,
    )

    rows = cursor.fetchall()
    connection.close()

    results = []

    for row in rows:
        data = dict(row)
        data["tool_used"] = bool(data.get("tool_used", 0))
        data["needs_human_review"] = bool(data.get("needs_human_review", 0))
        results.append(data)

    return results


def list_pending_human_reviews(
    workspace_id: str,
    limit: int = 20,
) -> List[Dict[str, Any]]:
    """
    Returns runs that need human review.
    """
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT
            id,
            task,
            selected_agent,
            tool_name,
            tool_used,
            score,
            status,
            needs_human_review,
            created_at
        FROM agent_runs
        WHERE workspace_id = ? AND status = 'NEEDS_HUMAN_REVIEW'
        ORDER BY created_at DESC
        LIMIT ?
        """,
        (workspace_id, limit),
    )

    rows = cursor.fetchall()
    connection.close()

    results = []

    for row in rows:
        data = dict(row)
        data["tool_used"] = bool(data.get("tool_used", 0))
        data["needs_human_review"] = bool(data.get("needs_human_review", 0))
        results.append(data)

    return results


def get_agent_run_by_id(run_id: str, workspace_id: str) -> Optional[Dict[str, Any]]:
    """
    Returns full details of a single run.
    """
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT *
        FROM agent_runs
        WHERE id = ? AND workspace_id = ?
        """,
        (run_id, workspace_id),
    )

    row = cursor.fetchone()
    connection.close()

    if row is None:
        return None

    return _row_to_dict(row)


def update_agent_run_after_human_review(
    run_id: str,
    workspace_id: str,
    status: str,
    final_answer: str,
    human_decision: str,
    human_feedback: str,
) -> Optional[Dict[str, Any]]:
    """
    Updates a run after human review.
    Also appends a message to the trace.
    """
    existing_run = get_agent_run_by_id(run_id, workspace_id)

    if existing_run is None:
        return None

    reviewed_at = datetime.now(timezone.utc).isoformat()

    trace = existing_run.get("trace", [])
    trace.append(
        f"Human reviewer action: {human_decision}. Status updated to {status}."
    )

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        UPDATE agent_runs
        SET
            status = ?,
            needs_human_review = ?,
            final_answer = ?,
            human_decision = ?,
            human_feedback = ?,
            reviewed_at = ?,
            trace_json = ?
        WHERE id = ?
        """,
        (
            status,
            0 if status != "NEEDS_HUMAN_REVIEW" else 1,
            final_answer,
            human_decision,
            human_feedback,
            reviewed_at,
            json.dumps(trace),
            run_id,
        ),
    )

    connection.commit()
    connection.close()

    return get_agent_run_by_id(run_id, workspace_id)
