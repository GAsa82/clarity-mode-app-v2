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

from .base import AIProvider, ProviderResponse, UsageStats

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

# ─── Lazy Provider Chain Building ────────────────────────────────────────────
# Each factory is a lambda so SDK imports happen on first call, not at import time

def _build_provider_chain():
    """Build the provider chain with lazy SDK imports.
    
    This runs at module level but each provider SDK is imported only
    when its factory is called, preventing import-time failures from
    blocking server startup.
    """
    # Always try all available providers in priority order
    # OpenRouter (free Llama 3.1) is included early as reliable fallback
    logger.info("Building provider chain (Gemini → OpenRouter → DeepSeek → paid)")
    return _lazy_chain([
        ("gemini_free",             1),
        ("openrouter",              2),
        ("deepseek_v4_free",        3),
        ("deepseek",                4),
        ("qwen",                    5),
        ("gemini_paid",             6),
        ("openai",                  7),
        ("claude",                  8),
    ])


def _lazy_chain(specs):
    """Build a provider chain from (name, priority) specs with lazy SDK loading.
    
    Each provider's SDK is imported only when create_*() is called.
    If an SDK is missing (not installed), the provider is simply skipped
    rather than crashing the entire server.
    """
    chain = []
    for name, _ in specs:
        try:
            provider = _create_provider(name)
            if provider is not None:
                chain.append(provider)
        except Exception as e:
            logger.warning(f"Failed to initialize provider '{name}' (lazy): {e}")
    return chain


def _create_provider(name):
    """Import and call a provider's factory function lazily."""
    factories = {
        "gemini_free": lambda: _import_gemini("free"),
        "gemini_paid": lambda: _import_gemini("paid"),
        "deepseek": lambda: _import_deepseek(),
        "deepseek_v4_free": lambda: _import_deepseek_v4_free(),
        "qwen": lambda: _import_qwen(),
        "openrouter": lambda: _import_openrouter(),
        "openai": lambda: _import_openai(),
        "claude": lambda: _import_claude(),
    }
    factory = factories.get(name)
    if factory is None:
        logger.error(f"Unknown provider: {name}")
        return None
    try:
        return factory()
    except Exception as e:
        logger.warning(f"Failed to create provider '{name}': {e}")
        return None


def _import_gemini(mode="free"):
    from .gemini_provider import create_gemini_free, create_gemini_paid
    return create_gemini_free() if mode == "free" else create_gemini_paid()


def _import_deepseek():
    from .deepseek_provider import create_deepseek
    return create_deepseek()


def _import_deepseek_v4_free():
    from .deepseek_provider import create_deepseek_v4_free
    return create_deepseek_v4_free()


def _import_qwen():
    from .qwen_provider import create_qwen
    return create_qwen()


def _import_openrouter():
    from .openrouter_provider import create_openrouter
    return create_openrouter()


def _import_openai():
    from .openai_provider import create_openai
    return create_openai()


def _import_claude():
    from .claude_provider import create_claude
    return create_claude()


# Build provider chain ONCE at import time, but each SDK loads lazily
PROVIDER_CHAIN = _build_provider_chain()

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