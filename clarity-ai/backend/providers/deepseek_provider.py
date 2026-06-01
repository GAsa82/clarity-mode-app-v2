"""
DeepSeek provider — supports deepseek-chat and deepseek-reasoner models.

Free tier via DeepSeek API: deepseek-chat (very affordable, good quality)

Environment variables:
- DEEPSEEK_API_KEY: API key from platform.deepseek.com
"""
import os
import logging

import httpx

from .base import AIProvider, ProviderConfig, ProviderResponse

logger = logging.getLogger(__name__)


class DeepSeekProvider(AIProvider):
    """DeepSeek provider via the OpenAI-compatible API."""

    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self._base_url = config.base_url or "https://api.deepseek.com"

    async def check_available(self) -> bool:
        api_key = self._config.get_api_key()
        if not api_key:
            return False
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self._base_url}/models"
                resp = await client.get(url, headers={"Authorization": f"Bearer {api_key}"}, timeout=5)
                return resp.status_code == 200
        except Exception:
            return False

    async def _generate(
        self,
        prompt: str,
        system_prompt: str,
        config: ProviderConfig,
    ) -> ProviderResponse:
        api_key = config.get_api_key()
        if not api_key:
            return ProviderResponse(
                text="", model_used=config.model, error="DEEPSEEK_API_KEY not configured"
            )

        model = config.model
        url = f"{self._base_url}/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": config.max_tokens,
            "temperature": config.temperature,
            "top_p": config.top_p,
        }

        try:
            async with httpx.AsyncClient(timeout=config.timeout) as client:
                resp = await client.post(url, json=payload, headers=headers)
                data = resp.json()

                if resp.status_code != 200:
                    error_msg = data.get("error", {}).get("message", str(resp.status_code))
                    return ProviderResponse(text="", model_used=model, error=error_msg)

                choice = data.get("choices", [{}])[0]
                text = choice.get("message", {}).get("content", "").strip()

                usage = data.get("usage", {})
                tokens_in = usage.get("prompt_tokens", 0)
                tokens_out = usage.get("completion_tokens", 0)

                return ProviderResponse(
                    text=text,
                    model_used=model,
                    tokens_in=tokens_in,
                    tokens_out=tokens_out,
                )

        except httpx.TimeoutException:
            return ProviderResponse(text="", model_used=model, error="DeepSeek request timed out")
        except Exception as e:
            return ProviderResponse(text="", model_used=model, error=str(e))


# ─── Factory ──────────────────────────────────────────────────────────────────

def create_deepseek() -> DeepSeekProvider:
    """Create the DeepSeek provider (second in fallback chain)."""
    config = ProviderConfig(
        name="DeepSeek",
        api_key_env="DEEPSEEK_API_KEY",
        model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
        max_tokens=int(os.getenv("DEEPSEEK_MAX_TOKENS", "1024")),
        temperature=float(os.getenv("AI_TEMPERATURE", "0.7")),
        is_free=False,  # Very cheap but not free
        priority=2,     # Second in fallback chain
        timeout=int(os.getenv("AI_TIMEOUT", "60")),
    )
    return DeepSeekProvider(config)


def create_deepseek_v4_free() -> DeepSeekProvider:
    """Create DeepSeek V3 Flash (free tier) provider — first in free chat chain.
    
    Uses the 'deepseek-chat' model via DeepSeek's API which has a free tier.
    This is the default for the first 5 chats.
    """
    config = ProviderConfig(
        name="DeepSeek V3 Flash",
        api_key_env="DEEPSEEK_API_KEY",
        model=os.getenv("DEEPSEEK_V4_MODEL", "deepseek-chat"),
        max_tokens=int(os.getenv("DEEPSEEK_MAX_TOKENS", "1024")),
        temperature=float(os.getenv("AI_TEMPERATURE", "0.7")),
        is_free=True,   # Free tier
        priority=1,     # First in free chat chain
        timeout=int(os.getenv("AI_TIMEOUT", "60")),
    )
    return DeepSeekProvider(config)
