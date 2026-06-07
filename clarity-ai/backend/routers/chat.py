"""
Chat router — AI Coach with full diary RAG + standalone coaching mode.
"""
import logging
from fastapi import APIRouter

from models.schemas import ChatRequest, ChatResponse
from database.chroma_client import search_diary, get_or_create_collection, get_all_entries
from utils.embeddings import generate_embedding
from database.chroma_client import PHILOSOPHY_COLLECTION as PHIL_COL
from providers import chat_with_fallback, get_provider_stats, PROVIDER_CHAIN

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["Chat"])

# ─── System prompts ───────────────────────────────────────────────────────────

_DIARY_SYSTEM_PROMPT = """You are Clarity — a deeply insightful personal AI life coach and analyst with access to the user's uploaded documents and diary entries.

Your mission: Read EVERYTHING in the provided context — diary entries, report cards, marksheets, certificates, notes — and give the user a human-like, intelligent interpretation of what it reveals about them.

Core behaviours:
- **Read ALL fields**: emotions, themes, grades, skill assessments, descriptive remarks, key facts, strengths, growth areas — use every piece of data available
- **Human-like judgment**: Don't just list data. Interpret it. Say things like "Your Grade A in Emotional Skills — combined with the descriptor saying you manage stress effectively — tells me you have strong inner resilience that you may be underestimating."
- **Cross-document insight**: If the user has both a diary and a report card, connect them. "Your diary mentions feeling overwhelmed with studies, but your grades show consistent performance — that gap between how you feel and how you perform is worth exploring."
- **Pattern recognition**: Spot recurring emotions, beliefs, or behaviours across all documents
- **Growth tracking**: Celebrate achievements, name specific strengths with evidence
- **Honest reflection**: Point out contradictions or blind spots kindly but directly
- **Actionable insight**: Always end with one concrete next step or reflective question
- **Language**: Match the user's language (English, Hindi, Hinglish)

Formatting:
- **Bold** for key insights
- Bullet points for lists and action steps
- 150–400 words — focused and specific
- End with ONE powerful follow-up question

Tone: Like a wise mentor who has studied everything about the user and genuinely wants them to flourish."""

_GENERAL_SYSTEM_PROMPT = """You are Clarity — a personal AI life coach specialising in emotional intelligence, mindfulness, and personal growth.

The user hasn't uploaded diary entries yet (or their question is general), so draw on your deep knowledge of psychology, CBT, mindfulness, habit science, and human potential.

Core behaviours:
- Provide genuine, personalised insights — not generic advice
- Ask questions that help the user discover their own answers
- Acknowledge emotions before offering solutions
- Offer frameworks the user can immediately apply (e.g. "Name the emotion, trace the trigger, choose the response")
- Support Hindi, Hinglish, and English

Formatting:
- Use **bold** for key insights
- Use bullet points for lists and action steps
- Keep responses 150–350 words — sharp and useful
- End with ONE powerful reflective question

Tone: Warm, intelligent, direct — like a coach who believes in the user's potential."""

_REFLECT_SYSTEM_PROMPT = """You are a reflective writing coach. Generate ONE powerful, open-ended journal prompt that:
1. Sparks genuine self-inquiry
2. Is specific enough to focus thought but open enough to allow surprise
3. Relates to a meaningful life theme (identity, purpose, relationships, growth, fear, gratitude, etc.)
4. Can be answered in 5–10 minutes of writing

Return ONLY the prompt text — no preamble, no explanation, no quotation marks."""

_INSIGHTS_SYSTEM_PROMPT = """You are an insightful therapist-coach analysing a user's diary patterns.

Based on the diary excerpts provided, generate a brief "Pattern Insight" — a 2–3 sentence observation about what you see across the entries. Focus on:
- Emotional patterns or recurring feelings
- Behavioural loops (what triggers → what response)
- Hidden strengths or resilience shown
- One gentle challenge or invitation for growth

Format: Plain prose, 2–3 sentences. No headers. Be specific, not generic."""


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _extract_chunks(results, key="documents"):
    out = []
    if not results or not results.get(key):
        return out
    for i, doc_list in enumerate(results[key]):
        for j, doc in enumerate(doc_list):
            meta = {}
            if results.get("metadatas") and len(results["metadatas"]) > i:
                ml = results["metadatas"][i]
                if j < len(ml):
                    meta = ml[j] or {}
            dist = results["distances"][i][j] if results.get("distances") else 0
            out.append({"document": doc, "metadata": meta, "distance": dist})
    return out


def _build_sources(diary_chunks):
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
                "relevance": round(1 - c.get("distance", 0), 3),
            })
        else:
            sources.append({"text": text[:200], "filename": "unknown", "emotions": "", "themes": "", "relevance": 0})
    return sources


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    query_emb = generate_embedding(request.query)

    # Step 1 — semantic search: find the most relevant chunks
    diary_results = search_diary(query_emb, n_results=request.n_results)
    diary_chunks = _extract_chunks(diary_results)

    # Step 2 — expand: pull ALL chunks from every matched document
    # Fixes the case where a document has multiple sections (e.g. report card page 1 = marks,
    # page 2 = life skills). The query may only match one section but the user expects answers
    # from the whole document.
    if diary_chunks:
        matched_file_ids = {
            c["metadata"].get("file_id", "")
            for c in diary_chunks
            if isinstance(c.get("metadata"), dict) and c["metadata"].get("file_id")
        }
        try:
            all_entries = get_all_entries()
            docs  = all_entries.get("documents", []) or []
            metas = all_entries.get("metadatas", []) or []
            ids   = all_entries.get("ids", []) or []
            seen_ids = {c["metadata"].get("file_id", "") + str(c["metadata"].get("chunk_index"))
                        for c in diary_chunks if isinstance(c.get("metadata"), dict)}
            for doc, meta, _ in zip(docs, metas, ids):
                if not meta or not isinstance(meta, dict):
                    continue
                if meta.get("file_id", "") not in matched_file_ids:
                    continue
                dedup_key = meta.get("file_id", "") + str(meta.get("chunk_index"))
                if dedup_key in seen_ids:
                    continue
                diary_chunks.append({"document": doc, "metadata": meta, "distance": 0.2})
                seen_ids.add(dedup_key)
        except Exception as e:
            logger.warning(f"Document expansion failed (non-critical): {e}")

    # Cap at 20 chunks total — prioritise lower distance (more relevant)
    diary_chunks.sort(key=lambda c: c.get("distance", 1.0))
    diary_chunks = diary_chunks[:20]

    philosophy_chunks = []
    if request.include_philosophy:
        try:
            phil_col = get_or_create_collection(PHIL_COL)
            phil_results = phil_col.query(query_embeddings=[query_emb], n_results=3)
            philosophy_chunks = _extract_chunks(phil_results)
        except Exception as e:
            logger.warning(f"Philosophy search failed: {e}")

    # Choose system prompt based on whether diary context is available
    system_prompt = _DIARY_SYSTEM_PROMPT if diary_chunks else _GENERAL_SYSTEM_PROMPT

    provider_response = await chat_with_fallback(
        prompt=request.query,
        system_prompt=system_prompt,
        context_chunks=diary_chunks if diary_chunks else None,
        philosophy_chunks=philosophy_chunks if philosophy_chunks else None,
    )

    provider_chain_names = [p.name for p in PROVIDER_CHAIN]
    fallback_occurred = (
        provider_response.provider_name != provider_chain_names[0]
        if provider_response.provider_name else False
    )

    if not provider_response.success:
        answer = (
            "I wasn't able to generate an answer right now. "
            "This could be because all AI providers are temporarily unavailable. "
            "Please try again later, or check that at least one API key is configured.\n\n"
            f"Details: {provider_response.error}"
        )
    else:
        answer = provider_response.text

    return ChatResponse(
        answer=answer,
        sources=_build_sources(diary_chunks),
        model_used=provider_response.model_used or "unknown",
        provider_name=provider_response.provider_name or "none",
        provider_chain=provider_chain_names,
        tokens_in=provider_response.tokens_in,
        tokens_out=provider_response.tokens_out,
        latency_ms=round(provider_response.latency_ms, 1),
        fallback_occurred=fallback_occurred,
        error=provider_response.error,
    )


@router.post("/reflect")
async def daily_reflection():
    """Generate a fresh daily journal reflection prompt."""
    provider_response = await chat_with_fallback(
        prompt="Generate one powerful journal reflection prompt for today.",
        system_prompt=_REFLECT_SYSTEM_PROMPT,
        context_chunks=None,
    )
    return {
        "prompt": provider_response.text.strip() if provider_response.success else (
            "What is one belief you hold about yourself that might not be completely true?"
        ),
        "model_used": provider_response.model_used or "unknown",
    }


@router.get("/insights")
async def proactive_insights():
    """Generate a proactive insight from the user's diary patterns."""
    from database.chroma_client import get_all_entries

    entries = get_all_entries()
    docs = (entries or {}).get("documents", [])[:8]
    metas = (entries or {}).get("metadatas", [])[:8]

    if not docs:
        return {
            "insight": "Upload your first diary entry to get personalised pattern insights from your AI Coach.",
            "has_data": False,
        }

    # Build a compact summary of what's in the entries
    emotion_pool = []
    theme_pool = []
    for meta in metas:
        if not meta or not isinstance(meta, dict):
            continue
        for e in (meta.get("emotions") or "").split(","):
            if e.strip():
                emotion_pool.append(e.strip())
        for t in (meta.get("themes") or "").split(","):
            if t.strip():
                theme_pool.append(t.strip())

    context_text = "\n\n".join(d[:400] for d in docs if d)
    emotions_summary = ", ".join(set(emotion_pool[:10]))
    themes_summary = ", ".join(set(theme_pool[:10]))

    prompt = (
        f"Diary excerpts:\n{context_text}\n\n"
        f"Detected emotions: {emotions_summary or 'none yet'}\n"
        f"Detected themes: {themes_summary or 'none yet'}\n\n"
        "Generate a brief pattern insight."
    )

    provider_response = await chat_with_fallback(
        prompt=prompt,
        system_prompt=_INSIGHTS_SYSTEM_PROMPT,
        context_chunks=None,
    )

    return {
        "insight": provider_response.text.strip() if provider_response.success else (
            "Keep journaling — patterns will emerge as you add more entries."
        ),
        "has_data": True,
        "emotions_detected": list(set(emotion_pool))[:5],
        "themes_detected": list(set(theme_pool))[:5],
    }


@router.get("/providers/stats")
async def provider_stats():
    return get_provider_stats()


@router.get("/providers/status")
async def provider_status():
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
        "chain_description": "Gemini 2.0 Flash → DeepSeek → Qwen (Local) → Gemini Paid → OpenRouter → OpenAI → Claude",
    }
