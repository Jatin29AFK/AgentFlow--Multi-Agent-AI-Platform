from __future__ import annotations

from functools import lru_cache
from math import sqrt
from typing import Optional

from app.core.config import settings
from app.core.logging import get_logger


logger = get_logger(__name__)


@lru_cache(maxsize=1)
def _load_model():
    try:
        from sentence_transformers import SentenceTransformer

        return SentenceTransformer(settings.MEMORY_EMBEDDING_MODEL)
    except Exception as exc:
        logger.warning(
            "Embedding model could not be loaded. Falling back to lexical memory search.",
            extra={"model": settings.MEMORY_EMBEDDING_MODEL},
            exc_info=exc,
        )
        return None


def embed_text(text: str) -> Optional[list[float]]:
    model = _load_model()
    if model is None:
        return None

    cleaned = (text or "").strip()
    if not cleaned:
        return None

    vector = model.encode(
        cleaned,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    return vector.astype(float).tolist()


def cosine_similarity(query_embedding: list[float], memory_embedding: list[float]) -> float:
    if not query_embedding or not memory_embedding:
        return 0.0

    if len(query_embedding) != len(memory_embedding):
        return 0.0

    query_norm = sqrt(sum(float(value) * float(value) for value in query_embedding))
    memory_norm = sqrt(sum(float(value) * float(value) for value in memory_embedding))
    denominator = query_norm * memory_norm
    if denominator == 0:
        return 0.0

    dot_product = sum(
        float(left) * float(right)
        for left, right in zip(query_embedding, memory_embedding)
    )
    return float(dot_product / denominator)
