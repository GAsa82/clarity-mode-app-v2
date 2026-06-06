from fastapi import APIRouter
import logging
from collections import Counter
from typing import Optional

from models.schemas import DashboardStats, PatternReport, TimelineResponse
from database.chroma_client import get_all_entries

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


def _iter_metadatas(entries: dict):
    """Yield each metadata dict from ChromaDB get() results (flat list)."""
    for meta in (entries or {}).get("metadatas") or []:
        if meta and isinstance(meta, dict):
            yield meta


@router.get("/", response_model=DashboardStats)
async def get_dashboard():
    entries = get_all_entries()
    total_chunks = len(entries.get("ids", [])) if entries else 0

    all_emotions: Counter = Counter()
    all_themes: Counter = Counter()
    unique_file_ids: set = set()

    for meta in _iter_metadatas(entries):
        file_id = meta.get("file_id", "")
        if file_id:
            unique_file_ids.add(file_id)
        for e in (meta.get("emotions") or "").split(","):
            if e.strip():
                all_emotions[e.strip()] += 1
        for t in (meta.get("themes") or "").split(","):
            if t.strip():
                all_themes[t.strip()] += 1

    return DashboardStats(
        total_entries=len(unique_file_ids),
        total_chunks=total_chunks,
        top_emotions=[{"emotion": k, "count": v} for k, v in all_emotions.most_common(10)],
        top_themes=[{"theme": k, "count": v} for k, v in all_themes.most_common(10)],
        recent_entries=[],
    )


@router.get("/patterns", response_model=PatternReport)
async def get_patterns(period: str = "monthly"):
    entries = get_all_entries()
    emotion_counts: Counter = Counter()
    belief_counts: Counter = Counter()

    for meta in _iter_metadatas(entries):
        for e in (meta.get("emotions") or "").split(","):
            if e.strip():
                emotion_counts[e.strip()] += 1
        for b in (meta.get("beliefs") or "").split(","):
            if b.strip():
                belief_counts[b.strip()] += 1

    patterns = []
    if belief_counts:
        patterns.append({
            "type": "recurring_beliefs",
            "data": dict(belief_counts.most_common(5)),
        })

    return PatternReport(
        period=period,
        patterns=patterns,
        emotional_trends={"top_emotions": dict(emotion_counts.most_common(5))},
        insights=["Upload more diary entries for deeper pattern analysis."],
    )


@router.get("/timeline", response_model=TimelineResponse)
async def get_timeline(_topic: Optional[str] = None):
    return TimelineResponse(
        evolution=[],
        contradictions=[],
        growth_indicators=["Start uploading diary entries to track your growth journey."],
    )
