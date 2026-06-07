"""
Base classes and types for the provider-agnostic AI layer.

Defines:
- ProviderConfig: configuration for a single provider
- ProviderResponse: standardized response from any provider
- UsageStats: per-provider usage tracking
- AIProvider: abstract base class that all providers implement
"""

from __future__ import annotations
import abc
import logging
import time
from dataclasses import dataclass
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)


# ─── Data Types ───────────────────────────────────────────────────────────────


@dataclass
class ProviderConfig:
    """Configuration for a single AI provider.

    Attributes:
        name: Human-readable provider name (e.g. "Gemini Flash")
        api_key_env: Name of the env var holding the API key
        model: Model identifier string (e.g. "gemini-2.0-flash-exp")
        base_url: Optional custom base URL for the API
        max_tokens: Maximum output tokens
        temperature: Sampling temperature (0.0 - 1.0)
        top_p: Nucleus sampling parameter
        is_free: Whether this provider has a free tier
        enabled: Whether this provider is enabled (read from env)
        priority: Lower number = tried first in fallback chain
        timeout: Request timeout in seconds
    """
    name: str
    api_key_env: str
    model: str
    base_url: Optional[str] = None
    max_tokens: int = 1024
    temperature: float = 0.7
    top_p: float = 0.9
    is_free: bool = False
    enabled: bool = True
    priority: int = 999
    timeout: int = 60

    def get_api_key(self) -> Optional[str]:
        """Read API key from environment."""
        import os
        return os.getenv(self.api_key_env)


@dataclass
class ProviderResponse:
    """Standardized response from any AI provider.

    Attributes:
        text: The generated text response
        model_used: The model name that actually generated the response
        provider_name: Name of the provider that handled the request
        tokens_in: Approximate input tokens
        tokens_out: Approximate output tokens
        latency_ms: Time taken in milliseconds
        cached: Whether the response was served from cache
        error: Error message if the request failed
    """
    text: str
    model_used: str = ""
    provider_name: str = ""
    tokens_in: int = 0
    tokens_out: int = 0
    latency_ms: float = 0.0
    cached: bool = False
    error: Optional[str] = None

    @property
    def success(self) -> bool:
        return self.error is None and bool(self.text)


@dataclass
class UsageStats:
    """Per-provider usage statistics, reset daily."""
    provider_name: str = ""
    total_requests: int = 0
    total_errors: int = 0
    total_tokens_in: int = 0
    total_tokens_out: int = 0
    total_latency_ms: float = 0.0
    last_used: Optional[str] = None
    last_error: Optional[str] = None
    consecutive_failures: int = 0
    active: bool = True  # temporarily disabled if too many failures

    @property
    def avg_latency_ms(self) -> float:
        if self.total_requests == 0:
            return 0.0
        return self.total_latency_ms / self.total_requests

    @property
    def error_rate(self) -> float:
        if self.total_requests == 0:
            return 0.0
        return self.total_errors / self.total_requests


# ─── Context Compression ──────────────────────────────────────────────────────


def compress_context(
    diary_chunks: List[Dict[str, Any]],
    max_chunks: int = 12,
    max_chars_per_chunk: int = 1500,
    philosophy_chunks: Optional[List[Dict[str, Any]]] = None,
    max_philosophy_chunks: int = 2,
) -> str:
    """Compress retrieved context to minimize token usage.

    - Limits the number of chunks
    - Truncates each chunk to a max character length
    - Removes low-relevance chunks (based on distance)
    - Merges similar chunks
    """
    # Sort by relevance (lowest distance = most relevant)
    sorted_diary = sorted(
        diary_chunks,
        key=lambda c: c.get("distance", 1.0)
    )[:max_chunks]

    compressed = []
    for chunk in sorted_diary:
        text = chunk.get("document", "")
        meta = chunk.get("metadata", {}) if isinstance(chunk.get("metadata"), dict) else {}

        if len(text) > max_chars_per_chunk:
            text = text[:max_chars_per_chunk] + "..."

        # Build a rich metadata header so the AI sees all extracted fields
        doc_type    = meta.get("doc_type", "") or meta.get("document_type", "")
        filename    = meta.get("filename", "")
        emotions    = meta.get("emotions", "")
        themes      = meta.get("themes", "")
        skills      = meta.get("skills", "")
        achievements = meta.get("achievements", "")
        strengths   = meta.get("strengths", "")
        growth      = meta.get("growth_areas", "")
        key_facts   = meta.get("key_facts", "")
        remarks     = meta.get("remarks", "")
        summary     = meta.get("summary", "")

        parts = []
        if filename:   parts.append(f"File: {filename}")
        if doc_type:   parts.append(f"Type: {doc_type}")
        if emotions:   parts.append(f"Emotions: {emotions}")
        if themes:     parts.append(f"Themes: {themes}")
        if skills:     parts.append(f"Skills assessed: {skills}")
        if achievements: parts.append(f"Achievements: {achievements}")
        if strengths:  parts.append(f"Strengths: {strengths}")
        if growth:     parts.append(f"Growth areas: {growth}")
        if key_facts:  parts.append(f"Key facts: {key_facts}")
        if remarks:    parts.append(f"Remarks: {remarks}")
        if summary:    parts.append(f"Summary: {summary}")

        header = " | ".join(parts) if parts else "Document"
        compressed.append(f"[{header}]\n{text}")

    # Add philosophy if available
    if philosophy_chunks:
        sorted_phil = philosophy_chunks[:max_philosophy_chunks]
        for chunk in sorted_phil:
            text = chunk.get("document", "")
            meta = chunk.get("metadata", {})
            category = meta.get("category", "insight") if isinstance(meta, dict) else "insight"

            if len(text) > max_chars_per_chunk:
                text = text[:max_chars_per_chunk] + "..."

            compressed.append(f"[Philosophy - {category}]: {text}")

    return "\n\n".join(compressed)


def estimate_tokens(text: str) -> int:
    """Rough estimate of token count (4 chars ≈ 1 token for most models)."""
    return len(text) // 4


# ─── Abstract Base Provider ───────────────────────────────────────────────────


class AIProvider(abc.ABC):
    """Abstract base class for all AI providers.

    Subclasses must implement:
    - _generate(self, prompt: str, system_prompt: str, config: ProviderConfig) -> ProviderResponse
    - _extract_entities(self, text: str, config: ProviderConfig) -> Dict[str, Any] (optional, falls back to JSON parsing)

    Subclasses may override:
    - name property
    - check_available() -> bool
    """

    def __init__(self, config: ProviderConfig):
        self._config = config
        self._logger = logging.getLogger(f"provider.{config.name.lower().replace(' ', '_')}")

    @property
    def config(self) -> ProviderConfig:
        return self._config

    @property
    def name(self) -> str:
        return self._config.name

    @property
    def enabled(self) -> bool:
        return self._config.enabled and bool(self._config.get_api_key())

    async def check_available(self) -> bool:
        """Check if this provider is available (API reachable, key valid)."""
        import os
        return bool(os.getenv(self._config.api_key_env))

    # ── Public API ──────────────────────────────────────────────────────────

    async def generate(
        self,
        prompt: str,
        system_prompt: str = "",
        context_chunks: Optional[List[Dict[str, Any]]] = None,
        philosophy_chunks: Optional[List[Dict[str, Any]]] = None,
    ) -> ProviderResponse:
        """Generate a response with optional diary context.

        This method:
        1. Compresses context to minimize tokens
        2. Builds the full prompt with context
        3. Calls _generate() (the subclass implementation)
        4. Wraps errors into ProviderResponse
        """
        start = time.time()

        # Compress context
        context_str = ""
        if context_chunks:
            context_str = compress_context(
                diary_chunks=context_chunks,
                philosophy_chunks=philosophy_chunks,
            )
            prompt = (
                f"Here are the relevant diary entries:\n\n{context_str}\n\n"
                f"User question: {prompt}\n\n"
                f"Please answer based on the above diary entries."
            )

        try:
            response = await self._generate(
                prompt=prompt,
                system_prompt=system_prompt,
                config=self._config,
            )
            response.latency_ms = (time.time() - start) * 1000
            response.provider_name = self.name
            if not response.model_used:
                response.model_used = self._config.model
            return response

        except Exception as e:
            elapsed = (time.time() - start) * 1000
            self._logger.error(f"Generation failed: {e}")
            return ProviderResponse(
                text="",
                model_used=self._config.model,
                provider_name=self.name,
                latency_ms=elapsed,
                error=str(e),
            )

    async def extract_entities(self, text: str) -> Dict[str, Any]:
        """Extract emotions, themes, beliefs from diary text.

        Returns a dict with at minimum 'emotions', 'themes', 'beliefs' keys.
        Falls back to _extract_entities or basic JSON parsing.
        """
        try:
            return await self._extract_entities(text, self._config)
        except Exception as e:
            self._logger.warning(f"Entity extraction failed for {self.name}: {e}")
            return {"emotions": [], "themes": [], "beliefs": []}

    # ── Subclass Implementations ────────────────────────────────────────────

    @abc.abstractmethod
    async def _generate(
        self,
        prompt: str,
        system_prompt: str,
        config: ProviderConfig,
    ) -> ProviderResponse:
        """Subclass must implement this to call the actual API."""
        ...

    async def _extract_entities(
        self,
        text: str,
        config: ProviderConfig,
    ) -> Dict[str, Any]:
        """Default: use _generate with a structured extraction prompt.

        Subclasses can override for native entity extraction APIs.
        """
        extraction_prompt = (
            'You are an expert document analyst. Analyze the text below and extract ALL meaningful information as JSON.\n\n'
            'First detect the document type (diary entry, report card, marksheet, certificate, letter, note, etc.).\n'
            'Then extract every relevant field for that type.\n\n'
            'Always return this structure (fill what is relevant, leave others as empty list/object):\n'
            '{\n'
            '  "document_type": "diary_entry | report_card | marksheet | certificate | letter | note | other",\n'
            '  "emotions": ["emotions expressed or implied — e.g. anxious, proud, lonely"],\n'
            '  "themes": ["main topics — e.g. relationships, studies, career, health"],\n'
            '  "beliefs": ["beliefs or values expressed — e.g. hard work pays off"],\n'
            '  "goals": ["mentioned goals or aspirations"],\n'
            '  "achievements": ["accomplishments, grades, awards, scores mentioned"],\n'
            '  "skills_assessed": {"skill_name": "grade or descriptor"},\n'
            '  "key_facts": ["important facts, dates, scores, names, identifiers"],\n'
            '  "strengths": ["strengths mentioned or implied"],\n'
            '  "areas_for_growth": ["weaknesses or improvement areas"],\n'
            '  "descriptive_remarks": ["full text of any evaluative/descriptive remarks — copy word for word"],\n'
            '  "people_mentioned": ["names of people, teachers, institutions"],\n'
            '  "summary": "one sentence summary of the entire document"\n'
            '}\n\n'
            'IMPORTANT: For report cards and marksheets — extract EVERY subject, grade, and descriptive indicator.\n'
            'For diary entries — focus on emotions, beliefs, and themes.\n'
            'Copy descriptive remarks verbatim, do not paraphrase.\n\n'
            f'Document text:\n{text[:8000]}\n\n'
            'Return ONLY valid JSON, no other text.'
        )

        response = await self._generate(
            prompt=extraction_prompt,
            system_prompt="You are a diary analysis assistant. Extract entities as JSON only.",
            config=config,
        )

        if response.success:
            import json, re
            try:
                return json.loads(response.text)
            except json.JSONDecodeError:
                match = re.search(r'\{.*\}', response.text, re.DOTALL)
                if match:
                    try:
                        return json.loads(match.group())
                    except json.JSONDecodeError:
                        pass

        return {"emotions": [], "themes": [], "beliefs": []}