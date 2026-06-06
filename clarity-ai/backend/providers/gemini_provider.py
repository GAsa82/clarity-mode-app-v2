"""
Google Gemini provider — stable v1 REST API.

Free:  gemini-1.5-flash  (fast, free)
Paid:  gemini-1.5-pro    (higher quality, same key)

Set GEMINI_API_KEY in Railway Variables (must start with AIzaSy...).
"""
import os
import logging

import httpx

from .base import AIProvider, ProviderConfig, ProviderResponse

logger = logging.getLogger(__name__)

_BASE = "https://generativelanguage.googleapis.com/v1"


class GeminiProvider(AIProvider):

    def __init__(self, config: ProviderConfig, paid_tier: bool = False):
        super().__init__(config)
        self._paid_tier = paid_tier

    @property
    def name(self) -> str:
        return "Gemini Paid" if self._paid_tier else "Gemini Flash"

    async def check_available(self) -> bool:
        api_key = self._config.get_api_key()
        if not api_key:
            return False
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(f"{_BASE}/models?key={api_key}")
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
            return ProviderResponse(text="", model_used=config.model, error="GEMINI_API_KEY not set")

        model = config.model
        url = f"{_BASE}/models/{model}:generateContent?key={api_key}"

        # Embed system prompt into the conversation — works for all Gemini models
        # (systemInstruction field is not consistently supported across v1 models)
        if system_prompt:
            full_prompt = f"{system_prompt}\n\n---\n\n{prompt}"
        else:
            full_prompt = prompt

        payload = {
            "contents": [{"parts": [{"text": full_prompt}]}],
            "generationConfig": {
                "maxOutputTokens": config.max_tokens,
                "temperature": config.temperature,
                "topP": config.top_p,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=config.timeout) as client:
                resp = await client.post(url, json=payload)
                data = resp.json()

            if resp.status_code != 200:
                error_msg = data.get("error", {}).get("message", str(resp.status_code))
                if resp.status_code == 429:
                    return ProviderResponse(text="", model_used=model,
                                            error=f"Gemini rate limited: {error_msg}")
                return ProviderResponse(text="", model_used=model, error=error_msg)

            candidates = data.get("candidates", [])
            if not candidates:
                finish = data.get("promptFeedback", {}).get("blockReason", "unknown")
                return ProviderResponse(text="", model_used=model,
                                        error=f"No candidates returned (blockReason: {finish})")

            parts = candidates[0].get("content", {}).get("parts", [])
            full_text = "".join(p.get("text", "") for p in parts).strip()

            usage = data.get("usageMetadata", {})
            return ProviderResponse(
                text=full_text,
                model_used=model,
                tokens_in=usage.get("promptTokenCount", len(full_prompt) // 4),
                tokens_out=usage.get("candidatesTokenCount", len(full_text) // 4),
            )

        except httpx.TimeoutException:
            return ProviderResponse(text="", model_used=model, error="Gemini request timed out")
        except Exception as e:
            return ProviderResponse(text="", model_used=model, error=str(e))


def create_gemini_free() -> GeminiProvider:
    config = ProviderConfig(
        name="Gemini Flash",
        api_key_env="GEMINI_API_KEY",
        model=os.getenv("GEMINI_FREE_MODEL", "gemini-2.0-flash"),
        max_tokens=int(os.getenv("GEMINI_MAX_TOKENS", "2048")),
        temperature=float(os.getenv("AI_TEMPERATURE", "0.7")),
        is_free=True,
        priority=1,
        timeout=int(os.getenv("AI_TIMEOUT", "60")),
    )
    return GeminiProvider(config, paid_tier=False)


def create_gemini_paid() -> GeminiProvider:
    config = ProviderConfig(
        name="Gemini Paid",
        api_key_env="GEMINI_API_KEY",
        model=os.getenv("GEMINI_PAID_MODEL", "gemini-2.0-flash"),
        max_tokens=int(os.getenv("GEMINI_MAX_TOKENS", "4096")),
        temperature=float(os.getenv("AI_TEMPERATURE", "0.7")),
        is_free=False,
        priority=4,
        timeout=int(os.getenv("AI_TIMEOUT", "90")),
    )
    return GeminiProvider(config, paid_tier=True)
