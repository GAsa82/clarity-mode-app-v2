# Provider-Agnostic AI Layer — Developer Guide

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Chat Router (routers/chat.py)                              │
│  → chat_with_fallback(prompt, system_prompt, context)       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Registry (providers/registry.py)                           │
│  → Manages provider chain                                   │
│  → Handles fallback logic                                   │
│  → Tracks daily usage stats                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Base Provider (providers/base.py)                          │
│  → Abstract AIProvider class                                │
│  → ProviderConfig, ProviderResponse, UsageStats             │
│  → Context compression                                      │
└──────┬──────┬──────┬──────┬──────┬──────┬───────────────────┘
       │      │      │      │      │      │
       ▼      ▼      ▼      ▼      ▼      ▼
┌─────┐ ┌──────┐ ┌────┐ ┌────────┐ ┌────┐ ┌──────┐
│Gemini│ │Deep‑ │ │Qwen│ │Open‑   │ │Open│ │Claude│
│Flash │ │Seek  │ │Lcl │ │Router  │ │AI  │ │      │
│(free)│ │      │ │    │ │(free)  │ │    │ │      │
└─────┘ └──────┘ └────┘ └────────┘ └────┘ └──────┘
Priority: 1       2       3       5       6       7
```

## Fallback Chain

```
Priority 1: Gemini Flash (free)          → needs GEMINI_API_KEY
Priority 2: DeepSeek (cheap)             → needs DEEPSEEK_API_KEY
Priority 3: Qwen (local via Ollama)      → needs Ollama running
Priority 4: Gemini Paid                  → needs GEMINI_API_KEY + billing
Priority 5: OpenRouter (free models)     → needs OPENROUTER_API_KEY
Priority 6: OpenAI (paid)                → needs OPENAI_API_KEY
Priority 7: Claude (paid)                → needs ANTHROPIC_API_KEY
```

- **Free providers are tried first.** Paid providers are only used when free ones fail.
- If a provider fails **5 consecutive times**, it's auto-disabled until the next day.
- Stats reset daily at midnight UTC.

## How to Add a New Provider

### 1. Create the provider file

```python
# clarity-ai/backend/providers/my_provider.py

import os
import logging
from typing import Optional, Dict, Any

import httpx
from .base import AIProvider, ProviderConfig, ProviderResponse

logger = logging.getLogger(__name__)


class MyProvider(AIProvider):
    """My custom AI provider."""

    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self._base_url = config.base_url or "https://api.myprovider.com"

    async def check_available(self) -> bool:
        """Optional: check if the API is reachable."""
        api_key = self._config.get_api_key()
        return bool(api_key)

    async def _generate(
        self,
        prompt: str,
        system_prompt: str,
        config: ProviderConfig,
    ) -> ProviderResponse:
        """Required: implement the actual API call."""
        api_key = config.get_api_key()
        if not api_key:
            return ProviderResponse(
                text="", model_used=config.model,
                error="MY_API_KEY not configured"
            )

        # Build your API request
        url = f"{self._base_url}/v1/chat/completions"
        headers = {"Authorization": f"Bearer {api_key}"}

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            async with httpx.AsyncClient(timeout=config.timeout) as client:
                resp = await client.post(
                    url,
                    json={
                        "model": config.model,
                        "messages": messages,
                        "max_tokens": config.max_tokens,
                        "temperature": config.temperature,
                    },
                    headers=headers,
                )
                data = resp.json()

                if resp.status_code != 200:
                    return ProviderResponse(
                        text="", model_used=config.model,
                        error=data.get("error", {}).get("message", str(resp.status_code))
                    )

                text = data["choices"][0]["message"]["content"].strip()
                usage = data.get("usage", {})

                return ProviderResponse(
                    text=text,
                    model_used=config.model,
                    tokens_in=usage.get("prompt_tokens", 0),
                    tokens_out=usage.get("completion_tokens", 0),
                )

        except httpx.TimeoutException:
            return ProviderResponse(
                text="", model_used=config.model,
                error="Request timed out"
            )
        except Exception as e:
            return ProviderResponse(
                text="", model_used=config.model,
                error=str(e)
            )


# 2. Create a factory function
def create_my_provider() -> MyProvider:
    """Create the MyProvider instance."""
    config = ProviderConfig(
        name="MyProvider",              # Human-readable name
        api_key_env="MY_API_KEY",       # Env var name for API key
        model=os.getenv("MY_MODEL", "my-model-name"),
        base_url=os.getenv("MY_API_URL", "https://api.myprovider.com"),
        max_tokens=int(os.getenv("MY_MAX_TOKENS", "1024")),
        temperature=float(os.getenv("AI_TEMPERATURE", "0.7")),
        is_free=False,                  # True if free tier exists
        priority=8,                     # Position in fallback chain
        timeout=int(os.getenv("AI_TIMEOUT", "60")),
    )
    return MyProvider(config)
```

### 2. Register in the registry

Edit `clarity-ai/backend/providers/registry.py`:

```python
# Add import at the top
from .my_provider import create_my_provider

# Add to PROVIDER_CHAIN list (in priority order)
PROVIDER_CHAIN = [
    create_gemini_free(),      # Priority 1
    create_deepseek(),         # Priority 2
    create_qwen(),             # Priority 3
    create_gemini_paid(),      # Priority 4
    create_openrouter(),       # Priority 5
    create_openai(),           # Priority 6
    create_claude(),           # Priority 7
    create_my_provider(),      # Priority 8 ← Add yours here
]
```

### 3. Add environment variables

Add to `clarity-ai/backend/.env`:

```env
# MyProvider
MY_API_KEY=your-api-key-here
MY_MODEL=my-model-name
MY_API_URL=https://api.myprovider.com
MY_MAX_TOKENS=1024
```

### 4. Export from package (optional)

If you want the provider accessible via the package namespace, add it to
`clarity-ai/backend/providers/__init__.py`.

## Context Compression (Token Optimization)

The base provider automatically compresses context before sending to any API:

| Setting | Default | Description |
|---------|---------|-------------|
| `max_chunks` | 5 | Max diary chunks to include |
| `max_chars_per_chunk` | 800 | Truncate each chunk to this length |
| `max_philosophy_chunks` | 2 | Max philosophy chunks |

This reduces token usage by roughly **60-70%** compared to sending raw chunks.

To override for a specific call:
```python
from providers.base import compress_context
compressed = compress_context(
    diary_chunks=chunks,
    max_chunks=3,
    max_chars_per_chunk=500,
)
```

## Provider Dashboard Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat/providers/stats` | GET | Usage stats for all providers |
| `/api/chat/providers/status` | GET | Current provider chain status |

The stats endpoint returns:
```json
{
  "Gemini Flash": {
    "name": "Gemini Flash",
    "model": "gemini-2.0-flash-exp",
    "is_free": true,
    "enabled": true,
    "active": true,
    "priority": 1,
    "total_requests": 42,
    "total_errors": 1,
    "error_rate": 0.024,
    "avg_latency_ms": 1250.5,
    "tokens_in": 15000,
    "tokens_out": 3000,
    "consecutive_failures": 0,
    "last_used": "2026-05-31T12:00:00",
    "last_error": null
  }
}
```

## Testing

```bash
# Start the backend
cd clarity-ai/backend
python main.py

# Test chat with fallback
curl -X POST http://localhost:8000/api/chat/ \
  -H "Content-Type: application/json" \
  -d '{"query": "What did I write about last week?"}'

# Check provider status
curl http://localhost:8000/api/chat/providers/status

# Check provider stats
curl http://localhost:8000/api/chat/providers/stats
```

## Design Principles

1. **Free-first**: Default priority favors free/cheap providers.
2. **Graceful degradation**: If a provider fails, the next in chain is tried automatically.
3. **Self-healing**: Providers with 5+ consecutive failures are disabled, but reset daily.
4. **Observable**: Every request logs which provider was used and how long it took.
5. **App-code isolation**: Application code calls `chat_with_fallback()` and never needs to know which provider is active.
6. **Minimal tokens**: Context is always compressed before API calls.