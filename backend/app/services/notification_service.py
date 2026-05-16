from __future__ import annotations

import httpx

from app.core.config import settings
from app.core.logging import get_logger


logger = get_logger(__name__)


def notify_pending_review(run: dict, workspace_id: str) -> None:
    webhook_url = settings.REVIEW_WEBHOOK_URL.strip()
    if not webhook_url:
        return

    payload = {
        "event": "agent_run_pending_review",
        "run_id": run.get("id") or run.get("run_id"),
        "workspace_id": workspace_id,
        "status": run.get("status"),
        "score": run.get("score"),
        "selected_agent": run.get("selected_agent"),
        "task": run.get("task"),
        "created_at": run.get("created_at"),
    }

    response = httpx.post(
        webhook_url,
        json=payload,
        timeout=settings.HTTP_TIMEOUT_SECONDS,
    )
    response.raise_for_status()

    logger.info(
        "Pending review webhook delivered.",
        extra={
            "run_id": payload["run_id"],
            "workspace_id": workspace_id,
            "status": payload["status"],
        },
    )
