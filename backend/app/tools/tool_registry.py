import ast
import html
import operator
import re
import xml.etree.ElementTree as ET
from collections import Counter
from typing import Any, Callable, Dict

import httpx

from app.core.config import settings

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
# External Research Tools
# -------------------------------

def wikipedia_search_tool(query: str) -> str:
    """
    Searches Wikipedia and returns top titles with summaries.
    """
    cleaned = (query or "").strip()
    if not cleaned:
        return "Wikipedia search error: no query provided."

    try:
        response = httpx.get(
            "https://en.wikipedia.org/w/api.php",
            params={
                "action": "query",
                "list": "search",
                "srsearch": cleaned,
                "srlimit": 3,
                "format": "json",
            },
            timeout=settings.HTTP_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        data = response.json()
        results = data.get("query", {}).get("search", [])

        if not results:
            return "Wikipedia search found no results."

        lines = []
        for index, item in enumerate(results, start=1):
            title = item.get("title", "Untitled")
            snippet = re.sub(r"<.*?>", "", item.get("snippet", ""))
            snippet = html.unescape(snippet).strip()
            lines.append(f"{index}. {title}: {snippet}")

        return "Wikipedia search results:\n" + "\n".join(lines)
    except Exception as exc:
        return f"Wikipedia search error: {exc}"


def arxiv_search_tool(query: str) -> str:
    """
    Searches arXiv and returns recent paper matches.
    """
    cleaned = (query or "").strip()
    if not cleaned:
        return "arXiv search error: no query provided."

    try:
        response = httpx.get(
            "https://export.arxiv.org/api/query",
            params={
                "search_query": f"all:{cleaned}",
                "start": 0,
                "max_results": 3,
                "sortBy": "relevance",
                "sortOrder": "descending",
            },
            timeout=settings.HTTP_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        root = ET.fromstring(response.text)
        namespace = {"atom": "http://www.w3.org/2005/Atom"}
        entries = root.findall("atom:entry", namespace)

        if not entries:
            return "arXiv search found no results."

        lines = []
        for index, entry in enumerate(entries, start=1):
            title = (entry.findtext("atom:title", default="", namespaces=namespace) or "").strip()
            summary = (
                entry.findtext("atom:summary", default="", namespaces=namespace) or ""
            ).strip()
            published = (
                entry.findtext("atom:published", default="", namespaces=namespace) or ""
            ).strip()
            lines.append(
                f"{index}. {title} ({published[:10]}): {summary[:240].replace(chr(10), ' ')}"
            )

        return "arXiv search results:\n" + "\n".join(lines)
    except Exception as exc:
        return f"arXiv search error: {exc}"


# -------------------------------
# Registry
# -------------------------------

TOOLS: Dict[str, Callable[[str], str]] = {
    "calculator": calculator_tool,
    "text_stats": text_stats_tool,
    "keyword_extractor": keyword_extractor_tool,
    "wikipedia_search": wikipedia_search_tool,
    "arxiv_search": arxiv_search_tool,
}


def list_tools() -> Dict[str, str]:
    return {
        "calculator": "Use for arithmetic calculations.",
        "text_stats": "Use for word count, character count, sentence count, and line count.",
        "keyword_extractor": "Use to extract important keywords from text.",
        "wikipedia_search": "Use for factual topic lookup from Wikipedia search results.",
        "arxiv_search": "Use for research-paper discovery from arXiv.",
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
