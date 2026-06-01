"""
Chat router — uses the provider-agnostic AI layer with automatic fallback.

Replaced direct Ollama calls with the new provider registry system.
"""
from fastapi import APIRouter, HTTPException
import logging

from models.schemas import ChatRequest, ChatResponse
from database.chroma_client import search_diary, get_or_create_collection
from utils.embeddings import generate_embedding
from database.chroma_client import DIARY_COLLECTION, PHILOSOPHY_COLLECTION as PHIL_COL
from providers import chat_with_fallback, get_provider_stats, PROVIDER_CHAIN

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["Chat"])


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    # Generate query embedding
    query_emb = generate_embedding(request.query)

    # Search diary
    diary_results = search_diary(query_emb, n_results=request.n_results)
    diary_chunks = []
    if diary_results and diary_results.get("documents"):
        for i, doc_list in enumerate(diary_results["documents"]):
            for j, doc in enumerate(doc_list):
                meta = {}
                if diary_results.get("metadatas") and len(diary_results["metadatas"]) > i:
                    ml = diary_results["metadatas"][i]
                    if j < len(ml):
                        meta = ml[j] or {}
                diary_chunks.append({
                    "document": doc,
                    "metadata": meta,
                    "distance": diary_results["distances"][i][j] if diary_results.get("distances") else 0
                })

    # Search philosophy
    philosophy_chunks = []
    if request.include_philosophy:
        try:
            phil_col = get_or_create_collection(PHIL_COL)
            phil_results = phil_col.query(
                query_embeddings=[query_emb],
                n_results=3
            )
            if phil_results and phil_results.get("documents"):
                for i, doc_list in enumerate(phil_results["documents"]):
                    for j, doc in enumerate(doc_list):
                        meta = {}
                        if phil_results.get("metadatas") and len(phil_results["metadatas"]) > i:
                            ml = phil_results["metadatas"][i]
                            if j < len(ml):
                                meta = ml[j] or {}
                        philosophy_chunks.append({
                            "document": doc,
                            "metadata": meta
                        })
        except Exception as e:
            logger.warning(f"Philosophy search failed: {e}")

    # If no diary chunks found, return early
    if not diary_chunks:
        return ChatResponse(
            answer="No diary entries found matching your query. Upload some diary pages first!",
            sources=[],
            model_used="Search Only",
            provider_name="none",
        )

    # Get AI answer from the provider-agnostic layer with automatic fallback
    provider_response = await chat_with_fallback(
        prompt=request.query,
        system_prompt=(
            "You are Clarity AI, a personal diary intelligence assistant. "
            "You answer questions based on the user's own diary entries, writings, and personal philosophy.\n\n"
            "Rules:\n"
            "1. ALWAYS base your answers on the provided diary entries. If the entries don't contain relevant information, say so.\n"
            "2. Support Hindi, Hinglish, and English queries and respond in the same language.\n"
            "3. Identify emotional patterns, recurring themes, and beliefs from the entries.\n"
            "4. Be honest about contradictions you find in the user's thinking.\n"
            "5. Be supportive, non-judgmental, and insightful.\n"
            "6. Quote specific diary excerpts when relevant.\n"
            "7. If the user asks about personal growth, compare past and recent entries when available."
        ),
        context_chunks=diary_chunks,
        philosophy_chunks=philosophy_chunks if philosophy_chunks else None,
    )

    # Build sources from diary chunks
    sources = []
    for c in diary_chunks[:5]:
        text = c.get("document", "")
        meta = c.get("metadata", {})
        if isinstance(meta, dict):
            sources.append({
                "text": text[:200],
                "filename": meta.get("filename", "unknown"),
                "emotions": meta.get("emotions", ""),
                "themes": meta.get("themes", ""),
                "relevance": round(1 - c.get("distance", 0), 3) if c.get("distance") else 0
            })
        else:
            sources.append({
                "text": text[:200],
                "filename": "unknown",
                "emotions": "",
                "themes": "",
                "relevance": 0,
            })

    # Determine if fallback occurred
    provider_chain_names = [p.name for p in PROVIDER_CHAIN]
    fallback_occurred = provider_response.provider_name != provider_chain_names[0] if provider_response.provider_name else False

    return ChatResponse(
        answer=provider_response.text if provider_response.success else (
            "I wasn't able to generate an answer right now. "
            "This could be because all AI providers are temporarily unavailable. "
            "Please try again later, or check that at least one API key is configured.\n\n"
            f"Details: {provider_response.error}"
        ),
        sources=sources,
        model_used=provider_response.model_used or "unknown",
        provider_name=provider_response.provider_name or "none",
        provider_chain=provider_chain_names,
        tokens_in=provider_response.tokens_in,
        tokens_out=provider_response.tokens_out,
        latency_ms=round(provider_response.latency_ms, 1),
        fallback_occurred=fallback_occurred,
        error=provider_response.error,
    )


@router.get("/providers/stats")
async def provider_stats():
    """Get usage statistics for all providers."""
    return get_provider_stats()


@router.get("/providers/status")
async def provider_status():
    """Get current provider chain status."""
    providers = []
    for p in PROVIDER_CHAIN:
        providers.append({
            "name": p.name,
            "model": p.config.model,
            "enabled": p.enabled,
            "is_free": p.config.is_free,
            "priority": p.config.priority,
        })
    return {
        "providers": providers,
        "count": len(providers),
        "chain_description": "Gemini Free → DeepSeek → Qwen (Local) → Gemini Paid → OpenRouter → OpenAI → Claude"
    }