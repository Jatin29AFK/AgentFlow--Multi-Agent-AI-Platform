import ast
import unittest

from app.tools.tool_registry import _safe_eval


class ToolRegistryTests(unittest.TestCase):
    def test_safe_eval_handles_simple_arithmetic(self):
        node = ast.parse("2 + 3 * 4", mode="eval").body
        self.assertEqual(_safe_eval(node), 14)

    def test_safe_eval_blocks_large_exponents(self):
        node = ast.parse("2 ** 9", mode="eval").body

        with self.assertRaises(ValueError):
            _safe_eval(node)
