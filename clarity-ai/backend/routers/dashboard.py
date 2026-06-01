from fastapi import APIRouter
import logging
from collections import Counter

from models.schemas import DashboardStats, DiaryEntry, PatternReport, TimelineResponse
from database.chroma_client import get_all_entries, get_entry_count

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/", response_model=DashboardStats)
async def get_dashboard():
    entries = get_all_entries()
    total_chunks = len(entries.get("ids", [])) if entries else 0

    # Gather metadata
    all_emotions = Counter()
    all_themes = Counter()
    recent_entries = []

    if entries and entries.get("metadatas"):
        for meta_list in entries["metadatas"]:
            if not isinstance(meta_list, list):
                continue
            for meta in meta_list:
                if not meta or not isinstance(meta, dict):
                    continue
                emotions = meta.get("emotions", "")
                themes = meta.get("themes", "")
                if emotions and isinstance(emotions, str):
                    for e in emotions.split(","):
                        if e.strip():
                            all_emotions[e.strip()] += 1
                if themes and isinstance(themes, str):
                    for t in themes.split(","):
                        if t.strip():
                            all_themes[t.strip()] += 1

    # Build recent entries
    total_entries_count = get_entry_count()

    return DashboardStats(
        total_entries=total_entries_count,
        total_chunks=total_chunks,
        top_emotions=[{"emotion": k, "count": v} for k, v in all_emotions.most_common(10)],
        top_themes=[{"theme": k, "count": v} for k, v in all_themes.most_common(10)],
        recent_entries=recent_entries[:5]
    )

@router.get("/patterns", response_model=PatternReport)
async def get_patterns(period: str = "monthly"):
    entries = get_all_entries()
    patterns = []
    emotional_trends = {}
    insights = []

    if entries and entries.get("metadatas"):
        emotion_counts = Counter()
        belief_counts = Counter()
        for meta_list in entries["metadatas"]:
            if not isinstance(meta_list, list):
                continue
            for meta in meta_list:
                if not meta or not isinstance(meta, dict):
                    continue
                emotions = meta.get("emotions", "")
                beliefs = meta.get("beliefs", "")
                if emotions and isinstance(emotions, str):
                    for e in emotions.split(","):
                        if e.strip():
                            emotion_counts[e.strip()] += 1
                if beliefs and isinstance(beliefs, str):
                    for b in beliefs.split(","):
                        if b.strip():
                            belief_counts[b.strip()] += 1

        emotional_trends = {"top_emotions": dict(emotion_counts.most_common(5))}
        if belief_counts:
            patterns.append({
                "type": "recurring_beliefs",
                "data": dict(belief_counts.most_common(5))
            })

    return PatternReport(
        period=period,
        patterns=patterns,
        emotional_trends=emotional_trends,
        insights=["Upload more diary entries for deeper pattern analysis."]
    )

@router.get("/timeline", response_model=TimelineResponse)
async def get_timeline(topic: str = None):
    return TimelineResponse(
        evolution=[],
        contradictions=[],
        growth_indicators=["Start uploading diary entries to track your growth journey."]
    )