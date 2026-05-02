import ast
import operator
import re
from collections import Counter
from typing import Any, Callable, Dict


# -------------------------------
# Safe Calculator Tool
# -------------------------------

_ALLOWED_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}


def _safe_eval(node: ast.AST) -> float:
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value

    if isinstance(node, ast.BinOp):
        left = _safe_eval(node.left)
        right = _safe_eval(node.right)
        op_type = type(node.op)

        if op_type not in _ALLOWED_OPERATORS:
            raise ValueError("Unsupported arithmetic operator.")

        if isinstance(node.op, ast.Pow) and abs(right) > 8:
            raise ValueError("Power value is too large for safe calculation.")

        return _ALLOWED_OPERATORS[op_type](left, right)

    if isinstance(node, ast.UnaryOp):
        operand = _safe_eval(node.operand)
        op_type = type(node.op)

        if op_type not in _ALLOWED_OPERATORS:
            raise ValueError("Unsupported unary operator.")

        return _ALLOWED_OPERATORS[op_type](operand)

    raise ValueError("Only simple arithmetic expressions are allowed.")


def calculator_tool(expression: str) -> str:
    """
    Safely evaluates arithmetic expressions.
    Example: 25 * 4 + 10
    """
    if not expression or len(expression) > 200:
        return "Calculator error: expression is empty or too long."

    try:
        parsed = ast.parse(expression, mode="eval")
        result = _safe_eval(parsed.body)
        return f"Calculator result: {expression} = {result}"
    except Exception as e:
        return f"Calculator error: {str(e)}"


# -------------------------------
# Text Stats Tool
# -------------------------------

def text_stats_tool(text: str) -> str:
    """
    Returns basic statistics for any text.
    """
    if not text:
        return "Text stats error: no text provided."

    words = re.findall(r"\b[\w'-]+\b", text)
    sentences = [s for s in re.split(r"[.!?]+", text) if s.strip()]
    lines = [line for line in text.splitlines() if line.strip()]

    return (
        "Text statistics:\n"
        f"- Characters: {len(text)}\n"
        f"- Words: {len(words)}\n"
        f"- Sentences: {len(sentences)}\n"
        f"- Non-empty lines: {len(lines)}"
    )


# -------------------------------
# Keyword Extractor Tool
# -------------------------------

_STOPWORDS = {
    "the", "is", "are", "a", "an", "and", "or", "to", "of", "in", "on", "for",
    "with", "this", "that", "it", "as", "by", "from", "at", "be", "can", "will",
    "should", "would", "could", "into", "using", "use", "over", "about", "your",
    "you", "my", "our", "their", "they", "we", "i"
}


def keyword_extractor_tool(text: str) -> str:
    """
    Extracts important keywords using simple frequency logic.
    """
    if not text:
        return "Keyword extractor error: no text provided."

    tokens = re.findall(r"\b[a-zA-Z][a-zA-Z0-9+-]*\b", text.lower())
    filtered_tokens = [
        token for token in tokens
        if token not in _STOPWORDS and len(token) > 2
    ]

    if not filtered_tokens:
        return "No strong keywords found."

    top_keywords = Counter(filtered_tokens).most_common(10)

    keyword_lines = [
        f"- {keyword}: {count}"
        for keyword, count in top_keywords
    ]

    return "Top keywords:\n" + "\n".join(keyword_lines)


# -------------------------------
# Registry
# -------------------------------

TOOLS: Dict[str, Callable[[str], str]] = {
    "calculator": calculator_tool,
    "text_stats": text_stats_tool,
    "keyword_extractor": keyword_extractor_tool,
}


def list_tools() -> Dict[str, str]:
    return {
        "calculator": "Use for arithmetic calculations.",
        "text_stats": "Use for word count, character count, sentence count, and line count.",
        "keyword_extractor": "Use to extract important keywords from text.",
    }


def run_tool(tool_name: str, tool_input: str) -> Dict[str, Any]:
    """
    Runs a tool by name and returns a structured result.
    """
    if tool_name not in TOOLS:
        return {
            "tool_used": False,
            "tool_name": tool_name,
            "result": f"Tool '{tool_name}' does not exist.",
        }

    result = TOOLS[tool_name](tool_input)

    return {
        "tool_used": True,
        "tool_name": tool_name,
        "result": result,
    }