import asyncio
import json
import uuid
from typing import List

from fastapi import APIRouter, Header, HTTPException, Query, Request
from fastapi.responses import StreamingResponse

from app.agents.agent_graph import run_agent_workflow, stream_agent_workflow_events
from app.core.config import settings
from app.core.logging import get_logger
from app.core.rate_limit import limiter
from app.repositories.agent_run_repository import (
    get_agent_run_by_id,
    list_agent_runs,
    list_pending_human_reviews,
    save_agent_run,
    update_agent_run_after_human_review,
)
from app.schemas.agent_schema import (
    AgentRunRequest,
    AgentRunResponse,
    AgentRunSummaryResponse,
    HumanReviewRequest,
)
from app.services.human_review_service import (
    generate_revised_answer_with_human_feedback,
)
from app.services.memory_service import extract_and_save_memories_from_run
from app.services.notification_service import notify_pending_review


router = APIRouter(prefix="/agent", tags=["Agent Workflow"])
logger = get_logger(__name__)


def _workspace_id_header(x_workspace_id: str | None) -> str:
    return (x_workspace_id or "default-workspace").strip() or "default-workspace"


def _build_agent_run_response(run: dict) -> AgentRunResponse:
    return AgentRunResponse(
        run_id=run.get("id") or run.get("run_id"),
        created_at=run["created_at"],
        task=run["task"],
        retrieved_memories=run.get("retrieved_memories", []),
        memory_context=run.get("memory_context", ""),
        selected_agent=run["selected_agent"],
        route_reason=run["route_reason"],
        plan=run["plan"],
        tool_name=run["tool_name"],
        tool_input=run["tool_input"],
        tool_result=run["tool_result"],
        tool_used=run["tool_used"],
        execution_result=run["execution_result"],
        review=run["review"],
        score=run["score"],
        final_answer=run["final_answer"],
        status=run["status"],
        needs_human_review=run["needs_human_review"],
        human_decision=run.get("human_decision"),
        human_feedback=run.get("human_feedback"),
        reviewed_at=run.get("reviewed_at"),
        trace=run["trace"],
    )


def _model_to_dict(model: AgentRunResponse) -> dict:
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()


async def _persist_run(result: dict, workspace_id: str) -> dict:
    saved_run = await asyncio.to_thread(save_agent_run, result, workspace_id)

    run_for_response = {
        **result,
        "id": saved_run["run_id"],
        "created_at": saved_run["created_at"],
    }

    return run_for_response


async def _run_post_persist_tasks(run_for_response: dict, workspace_id: str) -> None:
    try:
        if run_for_response.get("status") == "COMPLETED":
            await asyncio.to_thread(
                extract_and_save_memories_from_run,
                run_for_response,
                run_for_response["id"],
                workspace_id,
            )

        if run_for_response.get("status") == "NEEDS_HUMAN_REVIEW":
            await asyncio.to_thread(
                notify_pending_review,
                run_for_response,
                workspace_id,
            )
    except Exception as exc:
        logger.exception(
            "Post-persist workflow task failed.",
            extra={
                "run_id": run_for_response.get("id"),
                "workspace_id": workspace_id,
            },
            exc_info=exc,
        )


def _schedule_post_persist_tasks(run_for_response: dict, workspace_id: str) -> None:
    asyncio.create_task(_run_post_persist_tasks(run_for_response, workspace_id))


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _event_payload(run_id: str, sequence: int, **data) -> dict:
    return {
        "id": f"{run_id}-{sequence}",
        "run_id": run_id,
        **data,
    }


def _extract_state_payload(value: object, run_id: str) -> dict | None:
    if not isinstance(value, dict):
        return None

    if value.get("run_id") == run_id:
        return value

    for nested_value in value.values():
        if isinstance(nested_value, dict) and nested_value.get("run_id") == run_id:
            return nested_value

    return None


@router.post("/run", response_model=AgentRunResponse)
@limiter.limit(settings.RATE_LIMIT_AGENT_RUN)
async def run_agent(
    request: Request,
    body: AgentRunRequest,
    x_workspace_id: str | None = Header(default=None),
):
    try:
        workspace_id = _workspace_id_header(x_workspace_id)
        run_id = str(uuid.uuid4())
        result = await asyncio.to_thread(
            run_agent_workflow,
            body.task,
            workspace_id,
            run_id,
        )
        run_for_response = await _persist_run(result, workspace_id)
        _schedule_post_persist_tasks(run_for_response, workspace_id)
        return _build_agent_run_response(run_for_response)
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Agent workflow failed: {exc}",
        )


@router.post("/run/stream")
@limiter.limit(settings.RATE_LIMIT_AGENT_RUN)
async def run_agent_stream(
    request: Request,
    body: AgentRunRequest,
    x_workspace_id: str | None = Header(default=None),
):
    workspace_id = _workspace_id_header(x_workspace_id)
    run_id = str(uuid.uuid4())

    async def event_stream():
        latest_state = None
        event_sequence = 0

        try:
            event_sequence += 1
            yield _sse(
                "workflow_started",
                _event_payload(
                    run_id,
                    event_sequence,
                    workspace_id=workspace_id,
                ),
            )

            async for graph_event in stream_agent_workflow_events(
                body.task,
                workspace_id,
                run_id,
            ):
                event_name = graph_event.get("event", "")
                node_name = graph_event.get("name", "")
                metadata = graph_event.get("metadata", {}) or {}
                event_data = graph_event.get("data", {}) or {}
                node_from_metadata = metadata.get("langgraph_node")
                display_node = node_from_metadata or node_name

                if event_name == "on_chain_start" and node_from_metadata:
                    event_sequence += 1
                    yield _sse(
                        "node_started",
                        _event_payload(
                            run_id,
                            event_sequence,
                            node=display_node,
                        ),
                    )

                if event_name == "on_chain_end" and node_from_metadata:
                    output = event_data.get("output")
                    if isinstance(output, dict):
                        trace = output.get("trace", [])
                        event_sequence += 1
                        yield _sse(
                            "node_completed",
                            _event_payload(
                                run_id,
                                event_sequence,
                                node=display_node,
                                status=output.get("status"),
                                selected_agent=output.get("selected_agent"),
                                tool_name=output.get("tool_name"),
                                score=output.get("score"),
                                trace=trace[-1] if trace else None,
                            ),
                        )

                output = _extract_state_payload(event_data.get("output"), run_id)
                chunk = _extract_state_payload(event_data.get("chunk"), run_id)
                state_payload = output or chunk

                if state_payload:
                    output = state_payload
                    latest_state = output

                    if output.get("final_answer") or output.get("status") != "RUNNING":
                        event_sequence += 1
                        yield _sse(
                            "state_snapshot",
                            _event_payload(
                                run_id,
                                event_sequence,
                                status=output.get("status"),
                                selected_agent=output.get("selected_agent"),
                                tool_name=output.get("tool_name"),
                                score=output.get("score"),
                                trace_count=len(output.get("trace", [])),
                            ),
                        )

            if latest_state is None:
                raise RuntimeError("Workflow stream completed without a final state.")

            run_for_response = await _persist_run(latest_state, workspace_id)
            response_model = _build_agent_run_response(run_for_response)
            event_sequence += 1
            yield _sse(
                "run_saved",
                {
                    **_event_payload(run_id, event_sequence),
                    **_model_to_dict(response_model),
                },
            )
            _schedule_post_persist_tasks(run_for_response, workspace_id)
            event_sequence += 1
            yield _sse("done", _event_payload(run_id, event_sequence))
        except Exception as exc:
            event_sequence += 1
            yield _sse(
                "error",
                _event_payload(
                    run_id,
                    event_sequence,
                    detail=f"Agent workflow failed: {exc}",
                ),
            )

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.get("/runs", response_model=List[AgentRunSummaryResponse])
async def get_runs(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    query: str = Query(default="", max_length=200),
    status: str = Query(default="all", max_length=40),
    x_workspace_id: str | None = Header(default=None),
):
    try:
        return await asyncio.to_thread(
            list_agent_runs,
            _workspace_id_header(x_workspace_id),
            limit,
            offset,
            query,
            status,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch agent runs: {exc}",
        )


@router.get("/runs/{run_id}/export")
async def export_run(
    run_id: str,
    format: str = Query(default="json", pattern="^(json|text)$"),
    x_workspace_id: str | None = Header(default=None),
):
    run = await asyncio.to_thread(
        get_agent_run_by_id,
        run_id,
        _workspace_id_header(x_workspace_id),
    )

    if run is None:
        raise HTTPException(status_code=404, detail="Agent run not found.")

    if format == "text":
        return {
            "filename": f"agentflow-run-{run_id}.txt",
            "content": (
                f"Task:\n{run.get('task', '')}\n\n"
                f"Selected Agent:\n{run.get('selected_agent', '')}\n\n"
                f"Final Answer:\n{run.get('final_answer', '')}\n\n"
                f"Review:\n{run.get('review', '')}\n\n"
                f"Trace:\n" + "\n".join(run.get("trace", []))
            ),
        }

    return {
        "filename": f"agentflow-run-{run_id}.json",
        "content": run,
    }


@router.get("/reviews/pending", response_model=List[AgentRunSummaryResponse])
async def get_pending_reviews(
    limit: int = Query(default=20, ge=1, le=100),
    x_workspace_id: str | None = Header(default=None),
):
    try:
        return await asyncio.to_thread(
            list_pending_human_reviews,
            _workspace_id_header(x_workspace_id),
            limit,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch pending human reviews: {exc}",
        )


@router.get("/runs/{run_id}", response_model=AgentRunResponse)
async def get_run_detail(
    run_id: str,
    x_workspace_id: str | None = Header(default=None),
):
    try:
        run = await asyncio.to_thread(
            get_agent_run_by_id,
            run_id,
            _workspace_id_header(x_workspace_id),
        )

        if run is None:
            raise HTTPException(status_code=404, detail="Agent run not found.")

        return _build_agent_run_response(run)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch agent run detail: {exc}",
        )


@router.post("/runs/{run_id}/human-review", response_model=AgentRunResponse)
@limiter.limit(settings.RATE_LIMIT_REVIEW)
async def submit_human_review(
    request: Request,
    run_id: str,
    body: HumanReviewRequest,
    x_workspace_id: str | None = Header(default=None),
):
    try:
        workspace_id = _workspace_id_header(x_workspace_id)
        run = await asyncio.to_thread(get_agent_run_by_id, run_id, workspace_id)

        if run is None:
            raise HTTPException(status_code=404, detail="Agent run not found.")

        action = body.action
        feedback = body.feedback or ""

        if action == "approve":
            final_answer = run["execution_result"]
            updated_run = await asyncio.to_thread(
                update_agent_run_after_human_review,
                run_id,
                workspace_id,
                "COMPLETED",
                final_answer,
                "approved",
                feedback or "Approved by human reviewer.",
            )

        elif action == "revise":
            if not feedback.strip():
                raise HTTPException(
                    status_code=400,
                    detail="Feedback is required when action is 'revise'.",
                )

            final_answer = await asyncio.to_thread(
                generate_revised_answer_with_human_feedback,
                run,
                feedback,
            )

            updated_run = await asyncio.to_thread(
                update_agent_run_after_human_review,
                run_id,
                workspace_id,
                "COMPLETED",
                final_answer,
                "revised",
                feedback,
            )

        elif action == "reject":
            final_answer = "This agent run was rejected by the human reviewer."
            if feedback.strip():
                final_answer += f"\n\nReason: {feedback}"

            updated_run = await asyncio.to_thread(
                update_agent_run_after_human_review,
                run_id,
                workspace_id,
                "REJECTED",
                final_answer,
                "rejected",
                feedback or "Rejected by human reviewer.",
            )
        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid action. Use approve, revise, or reject.",
            )

        if updated_run is None:
            raise HTTPException(
                status_code=404,
                detail="Agent run not found after update.",
            )

        if updated_run.get("status") == "COMPLETED":
            await asyncio.to_thread(
                extract_and_save_memories_from_run,
                updated_run,
                run_id,
                workspace_id,
            )

        return _build_agent_run_response(updated_run)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Human review failed: {exc}",
        )
