"""
Provider Registry — manages all AI providers, fallback chain, and usage stats.

Fallback chain (free-first, by priority):
    1. Gemini Flash (free)     → needs GEMINI_API_KEY
    2. DeepSeek (cheap)         → needs DEEPSEEK_API_KEY
    3. Qwen local (free)        → needs Ollama running
    4. Gemini Paid              → needs GEMINI_API_KEY + billing
    5. OpenRouter (free models) → needs OPENROUTER_API_KEY
    6. OpenAI (paid)            → needs OPENAI_API_KEY
    7. Claude (paid)            → needs ANTHROPIC_API_KEY

If a provider fails, the next one in the chain is tried automatically.
"""
import os
import json
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone

from .base import AIProvider, ProviderResponse, UsageStats, ProviderConfig
from .gemini_provider import create_gemini_free, create_gemini_paid
from .deepseek_provider import create_deepseek, create_deepseek_v4_free
from .qwen_provider import create_qwen
from .openrouter_provider import create_openrouter
from .openai_provider import create_openai
from .claude_provider import create_claude

logger = logging.getLogger(__name__)

# ─── Free Chat Counter (persisted to disk) ────────────────────────────────────
_COUNTER_FILE = os.path.join(os.path.dirname(__file__), "..", ".free_chat_count.json")
_FREE_CHAT_LIMIT = 5  # First 5 chats use DeepSeek V3 Flash free

def _load_free_chat_count() -> int:
    """Load the number of free chats used from disk."""
    try:
        if os.path.exists(_COUNTER_FILE):
            with open(_COUNTER_FILE, "r") as f:
                data = json.load(f)
                return data.get("count", 0)
    except Exception:
        pass
    return 0

def _save_free_chat_count(count: int) -> None:
    """Save the number of free chats used to disk."""
    try:
        with open(_COUNTER_FILE, "w") as f:
            json.dump({"count": count}, f)
    except Exception as e:
        logger.warning(f"Failed to save free chat count: {e}")

def _increment_free_chat_count() -> int:
    """Increment and return the new free chat count."""
    count = _load_free_chat_count() + 1
    _save_free_chat_count(count)
    return count

def get_remaining_free_chats() -> int:
    """Get the number of remaining free chats."""
    used = _load_free_chat_count()
    return max(0, _FREE_CHAT_LIMIT - used)

# ─── Provider Chain Configuration ─────────────────────────────────────────────
# Ordered by priority (lower number = tried first)
# First 5 chats: DeepSeek V3 Flash (free) → Gemini Free → rest
# After 5 chats: Gemini Free → DeepSeek (paid) → rest
_free_chats_used = _load_free_chat_count()

if _free_chats_used < _FREE_CHAT_LIMIT:
    logger.info(f"Free chat mode: {_FREE_CHAT_LIMIT - _free_chats_used} free chats remaining (using DeepSeek V3 Flash)")
    PROVIDER_CHAIN = [
        create_deepseek_v4_free(),  # Priority 1 - DeepSeek V3 Flash (FREE, first 5 chats)
        create_gemini_free(),       # Priority 2 - Free
        create_deepseek(),          # Priority 3 - Very cheap (paid)
        create_qwen(),              # Priority 4 - Free (local)
        create_gemini_paid(),       # Priority 5 - Paid
        create_openrouter(),        # Priority 6 - Free/cheap
        create_openai(),            # Priority 7 - Paid
        create_claude(),            # Priority 8 - Paid
    ]
else:
    logger.info("Paid chat mode: using full provider chain")
    PROVIDER_CHAIN = [
        create_gemini_free(),      # Priority 1 - Free
        create_deepseek(),         # Priority 2 - Very cheap
        create_qwen(),             # Priority 3 - Free (local)
        create_gemini_paid(),      # Priority 4 - Paid
        create_openrouter(),       # Priority 5 - Free/cheap
        create_openai(),           # Priority 6 - Paid
        create_claude(),           # Priority 7 - Paid
    ]

# In-memory usage stats (reset daily)
_provider_stats: Dict[str, UsageStats] = {}
_current_date: str = ""
_last_fallback_provider: Optional[str] = None


def _ensure_stats() -> None:
    """Ensure stats dict is populated for all providers and reset daily."""
    global _current_date, _provider_stats

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if today != _current_date:
        _provider_stats = {}
        _current_date = today
        logger.info(f"Provider stats reset for new day: {today}")

    for provider in PROVIDER_CHAIN:
        name = provider.name
        if name not in _provider_stats:
            _provider_stats[name] = UsageStats(provider_name=name, active=True)


def _record_usage(provider_name: str, response: ProviderResponse) -> None:
    """Record usage for a provider."""
    stats = _provider_stats.get(provider_name)
    if stats:
        stats.total_requests += 1
        stats.total_latency_ms += response.latency_ms
        stats.total_tokens_in += response.tokens_in
        stats.total_tokens_out += response.tokens_out
        stats.last_used = datetime.now(timezone.utc).isoformat()

        if not response.success:
            stats.total_errors += 1
            stats.consecutive_failures += 1
            stats.last_error = response.error

            # Disable provider after 5 consecutive failures
            if stats.consecutive_failures >= 5:
                stats.active = False
                logger.warning(f"Provider '{provider_name}' disabled after {stats.consecutive_failures} consecutive failures")
        else:
            stats.consecutive_failures = 0


# ─── Public API ───────────────────────────────────────────────────────────────


def get_active_provider() -> Optional[AIProvider]:
    """Get the first enabled and active provider from the chain."""
    _ensure_stats()
    for provider in PROVIDER_CHAIN:
        name = provider.name
        stats = _provider_stats.get(name)
        if stats and not stats.active:
            continue
        if provider.enabled:
            return provider
    return None


async def chat_with_fallback(
    prompt: str,
    system_prompt: str = "",
    context_chunks: Optional[List[Dict[str, Any]]] = None,
    philosophy_chunks: Optional[List[Dict[str, Any]]] = None,
    preferred_provider: Optional[str] = None,
) -> ProviderResponse:
    """Send a chat request with automatic fallback across providers.

    Tries providers in priority order. If one fails, logs the error and
    tries the next one. Returns the first successful response.

    Args:
        prompt: The user's question / prompt
        system_prompt: System-level instructions
        context_chunks: Diary entries from vector search
        philosophy_chunks: Philosophy entries from vector search
        preferred_provider: If set, try this provider first (by name)

    Returns:
        ProviderResponse with the result, including which provider was used
    """
    global _last_fallback_provider
    _ensure_stats()

    # Build provider list - preferred first if specified
    providers_to_try = list(PROVIDER_CHAIN)
    if preferred_provider:
        preferred_idx = next(
            (i for i, p in enumerate(providers_to_try) if p.name == preferred_provider),
            -1
        )
        if preferred_idx >= 0:
            provider = providers_to_try.pop(preferred_idx)
            providers_to_try.insert(0, provider)

    last_error = None
    attempted_providers = []

    for provider in providers_to_try:
        name = provider.name
        stats = _provider_stats.get(name)

        # Skip if provider is disabled (too many failures)
        if stats and not stats.active:
            logger.info(f"Skipping disabled provider: {name}")
            attempted_providers.append(f"{name} (disabled)")
            continue

        # Skip if provider is not configured
        if not provider.enabled:
            logger.info(f"Skipping unconfigured provider: {name} (no API key)")
            attempted_providers.append(f"{name} (unconfigured)")
            continue

        logger.info(f"Trying provider: {name} ({provider.config.model})")
        attempted_providers.append(name)

        try:
            response = await provider.generate(
                prompt=prompt,
                system_prompt=system_prompt,
                context_chunks=context_chunks,
                philosophy_chunks=philosophy_chunks,
            )

            _record_usage(name, response)

            if response.success:
                _last_fallback_provider = name
                logger.info(f"✓ Provider '{name}' succeeded ({response.tokens_out} tokens, {response.latency_ms:.0f}ms)")
                # Add fallback info
                if len(attempted_providers) > 1:
                    response.model_used = f"{response.model_used} (via {name}, fallback from {', '.join(a for a in attempted_providers[:-1])})"
                # Increment free chat counter if using the free tier DeepSeek
                if name == "DeepSeek V3 Flash":
                    new_count = _increment_free_chat_count()
                    remaining_after = _FREE_CHAT_LIMIT - new_count
                    logger.info(f"Free chat used ({new_count}/{_FREE_CHAT_LIMIT}). Remaining: {remaining_after}")
                    if remaining_after <= 0:
                        logger.info("Free chat limit reached! Restart server to switch to paid provider chain.")
                return response
            else:
                last_error = response.error
                logger.warning(f"✗ Provider '{name}' failed: {response.error}")

        except Exception as e:
            last_error = str(e)
            logger.error(f"✗ Provider '{name}' threw exception: {e}")

    # All providers failed
    error_detail = f"Attempted: {', '.join(attempted_providers)}. Last error: {last_error}" if last_error else "No providers available"
    logger.error(f"All providers failed: {error_detail}")

    return ProviderResponse(
        text=(
            "I'm sorry, but I wasn't able to process your request right now. "
            "All AI providers are currently unavailable. "
            "Please check your API key configurations or try again later."
        ),
        model_used="none",
        provider_name="fallback-failed",
        error=error_detail,
    )


def get_provider(name: str) -> Optional[AIProvider]:
    """Get a specific provider by name."""
    for provider in PROVIDER_CHAIN:
        if provider.name == name:
            return provider
    return None


def get_provider_stats() -> Dict[str, Dict[str, Any]]:
    """Get usage statistics for all providers (for the dashboard)."""
    _ensure_stats()
    result = {}
    for provider in PROVIDER_CHAIN:
        name = provider.name
        stats = _provider_stats.get(name, UsageStats(provider_name=name))
        result[name] = {
            "name": name,
            "model": provider.config.model,
            "is_free": provider.config.is_free,
            "enabled": provider.enabled,
            "active": stats.active,
            "priority": provider.config.priority,
            "total_requests": stats.total_requests,
            "total_errors": stats.total_errors,
            "error_rate": round(stats.error_rate, 3),
            "avg_latency_ms": round(stats.avg_latency_ms, 1),
            "tokens_in": stats.total_tokens_in,
            "tokens_out": stats.total_tokens_out,
            "consecutive_failures": stats.consecutive_failures,
            "last_used": stats.last_used,
            "last_error": stats.last_error,
        }
    return result


def reset_daily_stats() -> None:
    """Manually reset daily statistics."""
    global _provider_stats, _current_date
    _provider_stats = {}
    _current_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    _ensure_stats()
    logger.info("Provider stats manually reset")


# ─── Init ─────────────────────────────────────────────────────────────────────

# Initialize stats on import
_ensure_stats()

logger.info(f"Provider registry initialized with {len(PROVIDER_CHAIN)} providers")
for p in PROVIDER_CHAIN:
    logger.info(f"  [{p.config.priority}] {p.name} ({p.config.model}) {'[FREE]' if p.config.is_free else '[PAID]'}")