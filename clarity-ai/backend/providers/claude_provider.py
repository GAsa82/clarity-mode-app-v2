"""
Claude (Anthropic) provider — supports Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku.

Environment variables:
- ANTHROPIC_API_KEY: API key from console.anthropic.com
- ANTHROPIC_MODEL: Model to use (default: claude-3-5-sonnet-20241022)
"""
import os
import logging
from typing import Optional, Dict, Any

import httpx

from .base import AIProvider, ProviderConfig, ProviderResponse

logger = logging.getLogger(__name__)


class ClaudeProvider(AIProvider):
    """Claude (Anthropic) provider via the Anthropic API."""

    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self._base_url = config.base_url or "https://api.anthropic.com"

    async def check_available(self) -> bool:
        api_key = self._config.get_api_key()
        if not api_key:
            return False
        try:
            async with httpx.AsyncClient() as client:
                url = f"{self._base_url}/v1/messages"
                resp = await client.post(
                    url,
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "claude-3-haiku-20240307",
                        "max_tokens": 10,
                        "messages": [{"role": "user", "content": "ping"}],
                    },
                    timeout=10
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
                text="", model_used=config.model, error="ANTHROPIC_API_KEY not configured"
            )

        model = config.model
        url = f"{self._base_url}/v1/messages"
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }

        payload: Dict[str, Any] = {
            "model": model,
            "max_tokens": config.max_tokens,
            "temperature": config.temperature,
            "messages": [{"role": "user", "content": prompt}],
        }

        if system_prompt:
            payload["system"] = system_prompt

        try:
            async with httpx.AsyncClient(timeout=config.timeout) as client:
                resp = await client.post(url, json=payload, headers=headers)
                data = resp.json()

                if resp.status_code != 200:
                    error_msg = data.get("error", {}).get("message", str(resp.status_code))
                    return ProviderResponse(text="", model_used=model, error=error_msg)

                # Extract text from content blocks
                content_blocks = data.get("content", [])
                full_text = ""
                for block in content_blocks:
                    if block.get("type") == "text":
                        full_text += block.get("text", "")

                # Token usage from Anthropic response
                usage = data.get("usage", {})
                tokens_in = usage.get("input_tokens", len(prompt) // 4)
                tokens_out = usage.get("output_tokens", len(full_text) // 4)

                return ProviderResponse(
                    text=full_text.strip(),
                    model_used=model,
                    tokens_in=tokens_in,
                    tokens_out=tokens_out,
                )

        except httpx.TimeoutException:
            return ProviderResponse(text="", model_used=model, error="Claude request timed out")
        except Exception as e:
            return ProviderResponse(text="", model_used=model, error=str(e))


# ─── Factory ──────────────────────────────────────────────────────────────────

def create_claude() -> ClaudeProvider:
    """Create the Claude provider — last in fallback chain."""
    config = ProviderConfig(
        name="Claude",
        api_key_env="ANTHROPIC_API_KEY",
        model=os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022"),
        max_tokens=int(os.getenv("ANTHROPIC_MAX_TOKENS", "1024")),
        temperature=float(os.getenv("AI_TEMPERATURE", "0.7")),
        is_free=False,
        priority=7,  # Last in fallback chain
        timeout=int(os.getenv("AI_TIMEOUT", "60")),
    )
    return ClaudeProvider(config)