import sqlite3
from pathlib import Path

from app.core.config import settings


def get_db_path() -> str:
    """
    Returns SQLite database path from settings.
    Creates parent folder if needed.
    """
    db_path = Path(settings.SQLITE_DB_PATH)

    if db_path.parent != Path("."):
        db_path.parent.mkdir(parents=True, exist_ok=True)

    return str(db_path)


def get_connection():
    """
    Creates a SQLite connection.
    row_factory lets us access rows like dictionaries.
    """
    connection = sqlite3.connect(get_db_path())
    connection.row_factory = sqlite3.Row
    return connection


def _column_exists(cursor, table_name: str, column_name: str) -> bool:
    """
    Checks if a column already exists in a table.
    This helps us safely update old database tables.
    """
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = cursor.fetchall()

    for column in columns:
        if column["name"] == column_name:
            return True

    return False


def _add_column_if_missing(cursor, table_name: str, column_name: str, column_definition: str):
    """
    Adds a new column only if it does not already exist.
    This prevents errors when restarting the server multiple times.
    """
    if not _column_exists(cursor, table_name, column_name):
        cursor.execute(
            f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}"
        )


def init_db():
    """
    Creates required tables if they do not exist.
    Also adds new columns if the database was created in an older step.
    """
    connection = get_connection()
    cursor = connection.cursor()

    # -------------------------------
    # Agent Runs Table
    # -------------------------------
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS agent_runs (
            id TEXT PRIMARY KEY,
            task TEXT NOT NULL,

            retrieved_memories_json TEXT DEFAULT '[]',
            memory_context TEXT,

            selected_agent TEXT,
            route_reason TEXT,
            plan TEXT,

            tool_name TEXT,
            tool_input TEXT,
            tool_result TEXT,
            tool_used INTEGER DEFAULT 0,

            execution_result TEXT,
            review TEXT,
            score INTEGER,
            final_answer TEXT,

            status TEXT DEFAULT 'COMPLETED',
            needs_human_review INTEGER DEFAULT 0,
            human_decision TEXT,
            human_feedback TEXT,
            reviewed_at TEXT,

            trace_json TEXT,
            created_at TEXT NOT NULL
        );
        """
    )

    _add_column_if_missing(
        cursor,
        "agent_runs",
        "status",
        "TEXT DEFAULT 'COMPLETED'"
    )

    _add_column_if_missing(
        cursor,
        "agent_runs",
        "needs_human_review",
        "INTEGER DEFAULT 0"
    )

    _add_column_if_missing(
        cursor,
        "agent_runs",
        "human_decision",
        "TEXT"
    )

    _add_column_if_missing(
        cursor,
        "agent_runs",
        "human_feedback",
        "TEXT"
    )

    _add_column_if_missing(
        cursor,
        "agent_runs",
        "reviewed_at",
        "TEXT"
    )

    _add_column_if_missing(
        cursor,
        "agent_runs",
        "retrieved_memories_json",
        "TEXT DEFAULT '[]'"
    )

    _add_column_if_missing(
        cursor,
        "agent_runs",
        "memory_context",
        "TEXT"
    )

    _add_column_if_missing(
        cursor,
        "agent_runs",
        "workspace_id",
        "TEXT DEFAULT 'default-workspace'"
    )

    # -------------------------------
    # Agent Memories Table
    # -------------------------------
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS agent_memories (
            id TEXT PRIMARY KEY,
            workspace_id TEXT DEFAULT 'default-workspace',
            content TEXT NOT NULL,
            source_run_id TEXT,
            tags_json TEXT DEFAULT '[]',
            importance INTEGER DEFAULT 3,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """
    )

    _add_column_if_missing(
        cursor,
        "agent_memories",
        "workspace_id",
        "TEXT DEFAULT 'default-workspace'"
    )

    connection.commit()
    connection.close()
