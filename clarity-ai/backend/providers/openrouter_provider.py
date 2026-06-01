"""
OpenRouter provider — access to many free and paid models through a single API.

Recommended free models on OpenRouter:
- mistralai/mistral-7b-instruct (free)
- google/gemma-2-9b-it (free)
- microsoft/phi-3-mini-128k-instruct (free)
- cognitivecomputations/dolphin-mixtral-8x7b (free)

Environment variables:
- OPENROUTER_API_KEY: API key from openrouter.ai
- OPENROUTER_MODEL: Model to use (default: mistralai/mistral-7b-instruct)
"""
import os
import logging

import httpx

from .base import AIProvider, ProviderConfig, ProviderResponse

logger = logging.getLogger(__name__)


class OpenRouterProvider(AIProvider):
    """OpenRouter provider — unified API for many models."""

    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self._base_url = config.base_url or "https://openrouter.ai/api"

    async def check_available(self) -> bool:
        api_key = self._config.get_api_key()
        if not api_key:
            return False
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self._base_url}/v1/models"
                resp = await client.get(
                    url,
                    headers={"Authorization": f"Bearer {api_key}"},
                    timeout=5
                )
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
                text="", model_used=config.model, error="OPENROUTER_API_KEY not configured"
            )

        model = config.model
        url = f"{self._base_url}/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": os.getenv("SITE_URL", "https://claritymode.com"),
            "X-Title": "Clarity AI",
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
                tokens_in = usage.get("prompt_tokens", len(prompt) // 4)
                tokens_out = usage.get("completion_tokens", len(text) // 4)

                return ProviderResponse(
                    text=text,
                    model_used=model,
                    tokens_in=tokens_in,
                    tokens_out=tokens_out,
                )

        except httpx.TimeoutException:
            return ProviderResponse(text="", model_used=model, error="OpenRouter request timed out")
        except Exception as e:
            return ProviderResponse(text="", model_used=model, error=str(e))


# ─── Factory ──────────────────────────────────────────────────────────────────

def create_openrouter() -> OpenRouterProvider:
    """Create the OpenRouter provider — fifth in fallback chain."""
    config = ProviderConfig(
        name="OpenRouter",
        api_key_env="OPENROUTER_API_KEY",
        model=os.getenv("OPENROUTER_MODEL", "mistralai/mistral-7b-instruct"),
        max_tokens=int(os.getenv("OPENROUTER_MAX_TOKENS", "1024")),
        temperature=float(os.getenv("AI_TEMPERATURE", "0.7")),
        is_free=True,
        priority=5,  # Fifth in fallback chain (after Gemini Paid)
        timeout=int(os.getenv("AI_TIMEOUT", "60")),
    )
    return OpenRouterProvider(config)