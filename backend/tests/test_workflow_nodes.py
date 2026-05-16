import unittest

from app.agents.workflow_nodes import (
    _fallback_agent_selection,
    _fallback_tool_selection,
    _is_valid_calculator_input,
)


class WorkflowNodeFallbackTests(unittest.TestCase):
    def test_fallback_agent_selection_prefers_code_for_engineering_tasks(self):
        agent = _fallback_agent_selection("Debug this FastAPI backend error")
        self.assertEqual(agent, "code")

    def test_fallback_agent_selection_prefers_research_for_papers(self):
        agent = _fallback_agent_selection("Summarize this research paper")
        self.assertEqual(agent, "research")

    def test_fallback_tool_selection_prefers_calculator_for_math(self):
        tool = _fallback_tool_selection("calculate 25 * 4 + 10")
        self.assertEqual(tool, "calculator")

    def test_fallback_tool_selection_prefers_arxiv_for_research_queries(self):
        tool = _fallback_tool_selection("Find recent research papers about agent memory")
        self.assertEqual(tool, "arxiv_search")

    def test_calculator_input_rejects_regular_text(self):
        self.assertFalse(_is_valid_calculator_input("share about nlp only"))

    def test_calculator_input_accepts_arithmetic(self):
        self.assertTrue(_is_valid_calculator_input("25 * 4 + 10"))
