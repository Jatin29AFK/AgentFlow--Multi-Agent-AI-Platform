import unittest

from app.agents.agent_graph import route_after_review, route_to_specialist


class AgentGraphRoutingTests(unittest.TestCase):
    def test_route_to_specialist_defaults_to_analysis(self):
        route = route_to_specialist({"selected_agent": "unknown"})
        self.assertEqual(route, "analysis")

    def test_route_to_specialist_maps_code(self):
        route = route_to_specialist({"selected_agent": "code"})
        self.assertEqual(route, "code")

    def test_route_after_review_requires_human_review_below_threshold(self):
        route = route_after_review({"score": 4})
        self.assertEqual(route, "human_review")

    def test_route_after_review_finalizes_high_score(self):
        route = route_after_review({"score": 9})
        self.assertEqual(route, "finalizer")
