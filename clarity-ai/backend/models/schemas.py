from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class UploadResponse(BaseModel):
    file_id: str
    filename: str
    status: str  # "processing", "completed", "error"
    extracted_text: Optional[str] = None
    error: Optional[str] = None
    chunks_count: Optional[int] = None

class BatchUploadResponse(BaseModel):
    total: int
    succeeded: int
    failed: int
    results: List[UploadResponse]

class ChatRequest(BaseModel):
    query: str
    n_results: int = 10
    include_philosophy: bool = True

class ChatResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]] = []
    model_used: str = "Qwen 2.5 (local)"
    provider_name: str = ""
    provider_chain: List[str] = []
    tokens_in: int = 0
    tokens_out: int = 0
    latency_ms: float = 0.0
    fallback_occurred: bool = False
    error: Optional[str] = None

class DiaryEntry(BaseModel):
    id: str
    text: str
    filename: str
    uploaded_at: str
    emotions: List[str] = []
    themes: List[str] = []
    metadata: Dict[str, Any] = {}

class DashboardStats(BaseModel):
    total_entries: int
    total_chunks: int
    top_emotions: List[Dict[str, int]]
    top_themes: List[Dict[str, int]]
    recent_entries: List[DiaryEntry] = []

class PatternReport(BaseModel):
    period: str  # "weekly", "monthly", "yearly"
    patterns: List[Dict[str, Any]]
    emotional_trends: Dict[str, Any]
    insights: List[str]

class TimelineRequest(BaseModel):
    topic: Optional[str] = None

class TimelineResponse(BaseModel):
    evolution: List[Dict[str, Any]]
    contradictions: List[str] = []
    growth_indicators: List[str] = []

class PhilosophyEntry(BaseModel):
    id: str
    title: str
    content: str
    category: str  # "principle", "insight", "mental_model"
    created_at: str

class PatternDetectionResult(BaseModel):
    fear_of_failure: float = 0.0
    comparison: float = 0.0
    self_worth: float = 0.0
    loneliness: float = 0.0
    validation_seeking: float = 0.0
    productivity_cycles: float = 0.0
    emotional_triggers: List[str] = []