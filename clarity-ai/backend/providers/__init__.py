"""
Provider-Agnostic AI Layer for Clarity AI.

This package provides a unified interface for multiple AI providers
with automatic fallback, context compression, and usage tracking.

Supported providers:
- Gemini Flash (free tier) — default, first in fallback chain
- DeepSeek
- Qwen (local via Ollama)
- Gemini Paid
- OpenRouter (free models)
- OpenAI
- Claude

Fallback chain (free-first):
    Gemini Free → DeepSeek → Qwen (local) → Gemini Paid → OpenRouter → OpenAI → Claude
"""

from .base import AIProvider, ProviderConfig, ProviderResponse, UsageStats
from .registry import get_provider, chat_with_fallback, get_active_provider, get_provider_stats, reset_daily_stats, get_remaining_free_chats, PROVIDER_CHAIN

__all__ = [
    "AIProvider",
    "ProviderConfig",
    "ProviderResponse",
    "UsageStats",
    "get_provider",
    "chat_with_fallback",
    "get_active_provider",
    "get_provider_stats",
    "reset_daily_stats",
    "PROVIDER_CHAIN",
]