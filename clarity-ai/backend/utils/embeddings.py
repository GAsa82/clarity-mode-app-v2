import os
import logging
import hashlib
from typing import List

logger = logging.getLogger(__name__)

EMBEDDING_DIM = 768  # Gemini text-embedding-004 dimension


def _gemini_embed_batch(texts: List[str]) -> List[List[float]] | None:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        import httpx
        url = (
            f"https://generativelanguage.googleapis.com/v1"
            f"/models/text-embedding-004:batchEmbedContents?key={api_key}"
        )
        requests_body = [
            {"model": "models/text-embedding-004", "content": {"parts": [{"text": t}]}}
            for t in texts
        ]
        with httpx.Client(timeout=60) as client:
            resp = client.post(url, json={"requests": requests_body})
        if resp.status_code == 200:
            data = resp.json()
            return [e["values"] for e in data.get("embeddings", [])]
        logger.warning(f"Gemini batch embed failed: {resp.status_code} {resp.text[:200]}")
    except Exception as e:
        logger.warning(f"Gemini batch embed error: {e}")
    return None


def _hash_embedding(text: str) -> List[float]:
    """Deterministic fallback — not semantic, but never crashes."""
    h = hashlib.sha256(text.encode()).digest()
    base = [b / 255.0 for b in h]  # 32 floats
    repeated = (base * ((EMBEDDING_DIM // 32) + 1))[:EMBEDDING_DIM]
    return repeated


def generate_embedding(text: str) -> List[float]:
    result = _gemini_embed_batch([text])
    if result and len(result) == 1:
        return result[0]
    logger.warning("Gemini embedding unavailable — using hash fallback (search quality reduced)")
    return _hash_embedding(text)


def generate_embeddings(texts: List[str]) -> List[List[float]]:
    if not texts:
        return []
    result = _gemini_embed_batch(texts)
    if result and len(result) == len(texts):
        return result
    # Individual fallback
    return [generate_embedding(t) for t in texts]
