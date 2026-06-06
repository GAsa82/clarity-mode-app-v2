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

    # Free models tried in order — updated June 2025 based on OpenRouter availability
    _FREE_FALLBACKS = [
        "meta-llama/llama-3.3-70b-instruct:free",
        "google/gemma-4-31b-it:free",
        "qwen/qwen3-next-80b-a3b-instruct:free",
        "google/gemma-4-26b-a4b-it:free",
        "openai/gpt-oss-20b:free",
        "nvidia/nemotron-3-nano-30b-a3b:free",
    ]

    async def _call_model(self, model: str, messages: list, config: ProviderConfig, api_key: str) -> ProviderResponse:
        url = f"{self._base_url}/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": os.getenv("SITE_URL", "https://claritymode.com"),
            "X-Title": "Clarity AI",
        }
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": config.max_tokens,
            "temperature": config.temperature,
            "top_p": config.top_p,
        }
        async with httpx.AsyncClient(timeout=config.timeout) as client:
            resp = await client.post(url, json=payload, headers=headers)
            data = resp.json()
        if resp.status_code != 200:
            error_msg = data.get("error", {}).get("message", str(resp.status_code))
            return ProviderResponse(text="", model_used=model, error=error_msg)
        choice = data.get("choices", [{}])[0]
        text = choice.get("message", {}).get("content", "").strip()
        usage = data.get("usage", {})
        return ProviderResponse(
            text=text,
            model_used=model,
            tokens_in=usage.get("prompt_tokens", len(str(messages)) // 4),
            tokens_out=usage.get("completion_tokens", len(text) // 4),
        )

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

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        # Build list: configured model first, then free fallbacks
        models_to_try = [config.model] + [m for m in self._FREE_FALLBACKS if m != config.model]

        last_error = ""
        for model in models_to_try:
            try:
                result = await self._call_model(model, messages, config, api_key)
                if result.text:  # Got a real response — success
                    return result
                # Empty text or error — try next model
                last_error = result.error or "empty response"
                logger.warning(f"OpenRouter: {model} failed ({last_error}), trying next free model")
            except httpx.TimeoutException:
                last_error = f"{model} timed out"
                logger.warning(f"OpenRouter: {model} timed out, trying next")
            except Exception as e:
                last_error = str(e)
                logger.warning(f"OpenRouter: {model} exception ({e}), trying next")
        return ProviderResponse(text="", model_used=config.model, error=f"All OpenRouter free models failed. Last: {last_error}")


# ─── Factory ──────────────────────────────────────────────────────────────────

def create_openrouter() -> OpenRouterProvider:
    """Create the OpenRouter provider — free Llama 3.1 model, no billing needed."""
    config = ProviderConfig(
        name="OpenRouter",
        api_key_env="OPENROUTER_API_KEY",
        model=os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free"),
        max_tokens=int(os.getenv("OPENROUTER_MAX_TOKENS", "2048")),
        temperature=float(os.getenv("AI_TEMPERATURE", "0.7")),
        is_free=True,
        priority=2,  # High priority — free and reliable
        timeout=int(os.getenv("AI_TIMEOUT", "60")),
    )
    return OpenRouterProvider(config)