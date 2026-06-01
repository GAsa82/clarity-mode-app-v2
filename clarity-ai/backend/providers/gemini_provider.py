"""
Google Gemini provider — supports both free (Gemini Flash) and paid tiers.

Free tier uses: gemini-2.0-flash-exp (rate-limited but free)
Paid tier uses: gemini-1.5-pro (higher limits, better quality)

Environment variables:
- GEMINI_API_KEY: API key for Gemini (required for both tiers)
"""
import os
import json
import logging
from typing import Optional, Dict, Any, List

import httpx

from .base import AIProvider, ProviderConfig, ProviderResponse

logger = logging.getLogger(__name__)


class GeminiProvider(AIProvider):
    """Google Gemini provider via the REST API."""

    def __init__(self, config: ProviderConfig, paid_tier: bool = False):
        super().__init__(config)
        self._paid_tier = paid_tier
        self._base_url = config.base_url or "https://generativelanguage.googleapis.com/v1beta"

    @property
    def name(self) -> str:
        return "Gemini Paid" if self._paid_tier else "Gemini Flash"

    async def check_available(self) -> bool:
        api_key = self._config.get_api_key()
        if not api_key:
            return False
        # Quick check: hit the models endpoint
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self._base_url}/models?key={api_key}"
                resp = await client.get(url, timeout=5)
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
                text="", model_used=config.model, error="GEMINI_API_KEY not configured"
            )

        model = config.model
        url = f"{self._base_url}/models/{model}:generateContent?key={api_key}"

        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "maxOutputTokens": config.max_tokens,
                "temperature": config.temperature,
                "topP": config.top_p,
            }
        }

        if system_prompt:
            payload["systemInstruction"] = {
                "parts": [{"text": system_prompt}]
            }

        try:
            async with httpx.AsyncClient(timeout=config.timeout) as client:
                resp = await client.post(url, json=payload)
                data = resp.json()

                if resp.status_code != 200:
                    error_msg = data.get("error", {}).get("message", str(resp.status_code))
                    # Handle rate limiting / quota
                    if resp.status_code == 429:
                        return ProviderResponse(
                            text="", model_used=model,
                            error=f"Gemini rate limited (free tier quota exceeded): {error_msg}"
                        )
                    return ProviderResponse(
                        text="", model_used=model, error=error_msg
                    )

                # Extract text from response
                candidates = data.get("candidates", [])
                if not candidates:
                    return ProviderResponse(
                        text="", model_used=model,
                        error="No candidates returned from Gemini"
                    )

                parts = candidates[0].get("content", {}).get("parts", [])
                full_text = "".join(p.get("text", "") for p in parts)

                # Rough token estimate
                usage = data.get("usageMetadata", {})
                tokens_in = usage.get("promptTokenCount", len(prompt) // 4)
                tokens_out = usage.get("candidatesTokenCount", len(full_text) // 4)

                return ProviderResponse(
                    text=full_text.strip(),
                    model_used=model,
                    tokens_in=tokens_in,
                    tokens_out=tokens_out,
                )

        except httpx.TimeoutException:
            return ProviderResponse(
                text="", model_used=model, error="Gemini request timed out"
            )
        except Exception as e:
            return ProviderResponse(
                text="", model_used=model, error=str(e)
            )


# ─── Factory functions ────────────────────────────────────────────────────────

def create_gemini_free() -> GeminiProvider:
    """Create the Gemini Flash (free tier) provider."""
    config = ProviderConfig(
        name="Gemini Flash",
        api_key_env="GEMINI_API_KEY",
        model=os.getenv("GEMINI_FREE_MODEL", "gemini-2.0-flash"),
        max_tokens=int(os.getenv("GEMINI_MAX_TOKENS", "1024")),
        temperature=float(os.getenv("AI_TEMPERATURE", "0.7")),
        is_free=True,
        priority=1,  # First in fallback chain
        timeout=int(os.getenv("AI_TIMEOUT", "60")),
    )
    return GeminiProvider(config, paid_tier=False)


def create_gemini_paid() -> GeminiProvider:
    """Create the Gemini Pro (paid tier) provider."""
    config = ProviderConfig(
        name="Gemini Paid",
        api_key_env="GEMINI_API_KEY",
        model=os.getenv("GEMINI_PAID_MODEL", "gemini-2.5-pro-preview-06-05"),
        max_tokens=int(os.getenv("GEMINI_MAX_TOKENS", "2048")),
        temperature=float(os.getenv("AI_TEMPERATURE", "0.7")),
        is_free=False,
        priority=4,  # After Qwen in fallback chain
        timeout=int(os.getenv("AI_TIMEOUT", "60")),
    )
    return GeminiProvider(config, paid_tier=True)