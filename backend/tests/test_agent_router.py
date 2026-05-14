import unittest
from unittest.mock import patch

from app.routers.agent_router import submit_human_review
from app.schemas.agent_schema import HumanReviewRequest


class SubmitHumanReviewTests(unittest.TestCase):
    def setUp(self):
        self.workspace_id = "workspace-123"
        self.run_id = "run-123"
        self.run = {
            "task": "Draft a concise project summary.",
            "selected_agent": "writing",
            "execution_result": "Original answer",
            "review": "Looks good overall.",
            "score": 6,
        }

    @patch("app.routers.agent_router._build_agent_run_response")
    @patch("app.routers.agent_router.extract_and_save_memories_from_run")
    @patch("app.routers.agent_router.update_agent_run_after_human_review")
    @patch("app.routers.agent_router.get_agent_run_by_id")
    def test_approve_extracts_memories_for_completed_run(
        self,
        mock_get_run,
        mock_update_run,
        mock_extract_memories,
        mock_build_response,
    ):
        updated_run = {"status": "COMPLETED"}
        mock_get_run.return_value = self.run
        mock_update_run.return_value = updated_run
        mock_build_response.return_value = {"status": "COMPLETED"}

        response = submit_human_review(
            self.run_id,
            HumanReviewRequest(action="approve"),
            self.workspace_id,
        )

        self.assertEqual(response, {"status": "COMPLETED"})
        mock_extract_memories.assert_called_once_with(
            run=updated_run,
            run_id=self.run_id,
            workspace_id=self.workspace_id,
        )

    @patch("app.routers.agent_router._build_agent_run_response")
    @patch("app.routers.agent_router.extract_and_save_memories_from_run")
    @patch("app.routers.agent_router.update_agent_run_after_human_review")
    @patch("app.routers.agent_router.get_agent_run_by_id")
    def test_reject_skips_memory_extraction(
        self,
        mock_get_run,
        mock_update_run,
        mock_extract_memories,
        mock_build_response,
    ):
        updated_run = {"status": "REJECTED"}
        mock_get_run.return_value = self.run
        mock_update_run.return_value = updated_run
        mock_build_response.return_value = {"status": "REJECTED"}

        response = submit_human_review(
            self.run_id,
            HumanReviewRequest(action="reject", feedback="Not useful enough."),
            self.workspace_id,
        )

        self.assertEqual(response, {"status": "REJECTED"})
        mock_extract_memories.assert_not_called()
