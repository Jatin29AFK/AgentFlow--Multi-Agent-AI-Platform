from typing import List

from fastapi import APIRouter, HTTPException, Query

from app.agents.agent_graph import run_agent_workflow
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


router = APIRouter(prefix="/agent", tags=["Agent Workflow"])


def _build_agent_run_response(run: dict) -> AgentRunResponse:
    """
    Converts database/run dictionary into API response model.
    This avoids repeating the same response-building code.
    """
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


@router.post("/run", response_model=AgentRunResponse)
def run_agent(request: AgentRunRequest):
    try:
        result = run_agent_workflow(request.task)
        saved_run = save_agent_run(result)

        if result.get("status") == "COMPLETED":
            extract_and_save_memories_from_run(
                run=result,
                run_id=saved_run["run_id"],
            )

        run_for_response = {
            **result,
            "id": saved_run["run_id"],
            "created_at": saved_run["created_at"],
        }

        return _build_agent_run_response(run_for_response)

    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Agent workflow failed: {str(e)}"
        )


@router.get("/runs", response_model=List[AgentRunSummaryResponse])
def get_runs(
    limit: int = Query(default=20, ge=1, le=100)
):
    try:
        return list_agent_runs(limit=limit)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch agent runs: {str(e)}"
        )


@router.get("/reviews/pending", response_model=List[AgentRunSummaryResponse])
def get_pending_reviews(
    limit: int = Query(default=20, ge=1, le=100)
):
    try:
        return list_pending_human_reviews(limit=limit)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch pending human reviews: {str(e)}"
        )


@router.get("/runs/{run_id}", response_model=AgentRunResponse)
def get_run_detail(run_id: str):
    try:
        run = get_agent_run_by_id(run_id)

        if run is None:
            raise HTTPException(
                status_code=404,
                detail="Agent run not found."
            )

        return _build_agent_run_response(run)

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch agent run detail: {str(e)}"
        )


@router.post("/runs/{run_id}/human-review", response_model=AgentRunResponse)
def submit_human_review(run_id: str, request: HumanReviewRequest):
    try:
        run = get_agent_run_by_id(run_id)

        if run is None:
            raise HTTPException(
                status_code=404,
                detail="Agent run not found."
            )

        action = request.action
        feedback = request.feedback or ""

        if action == "approve":
            final_answer = run["execution_result"]
            updated_run = update_agent_run_after_human_review(
                run_id=run_id,
                status="COMPLETED",
                final_answer=final_answer,
                human_decision="approved",
                human_feedback=feedback or "Approved by human reviewer.",
            )

        elif action == "revise":
            if not feedback.strip():
                raise HTTPException(
                    status_code=400,
                    detail="Feedback is required when action is 'revise'."
                )

            final_answer = generate_revised_answer_with_human_feedback(
                run=run,
                human_feedback=feedback,
            )

            updated_run = update_agent_run_after_human_review(
                run_id=run_id,
                status="COMPLETED",
                final_answer=final_answer,
                human_decision="revised",
                human_feedback=feedback,
            )

        elif action == "reject":
            final_answer = (
                "This agent run was rejected by the human reviewer."
            )

            if feedback.strip():
                final_answer += f"\n\nReason: {feedback}"

            updated_run = update_agent_run_after_human_review(
                run_id=run_id,
                status="REJECTED",
                final_answer=final_answer,
                human_decision="rejected",
                human_feedback=feedback or "Rejected by human reviewer.",
            )

        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid action. Use approve, revise, or reject."
            )

        if updated_run is None:
            raise HTTPException(
                status_code=404,
                detail="Agent run not found after update."
            )

            if updated_run.get("status") == "COMPLETED":
                extract_and_save_memories_from_run(
                run=updated_run,
                run_id=run_id,
            )   

        return _build_agent_run_response(updated_run)

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Human review failed: {str(e)}"
        )