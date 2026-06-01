"""
Qwen provider — runs locally via Ollama.

This is the free self-hosted fallback. Uses the Ollama API on localhost.

Environment variables:
- OLLAMA_HOST: Ollama server URL (default: http://127.0.0.1:11434)
- OLLAMA_MODEL: Model name (default: qwen2.5:7b)
"""
import os
import json
import logging
import re
from typing import Optional, Dict, Any, List

import httpx

from .base import AIProvider, ProviderConfig, ProviderResponse

logger = logging.getLogger(__name__)


class QwenProvider(AIProvider):
    """Qwen model running locally via Ollama."""

    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self._base_url = config.base_url or "http://127.0.0.1:11434"

    async def check_available(self) -> bool:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"{self._base_url}/api/tags", timeout=5)
                if resp.status_code == 200:
                    data = resp.json()
                    models = [m["name"] for m in data.get("models", [])]
                    # Check if the configured model (or a partial match) is available
                    configured = self._config.model
                    if configured in models:
                        return True
                    # Partial match
                    for m in models:
                        if configured.split(":")[0] in m or configured in m:
                            return True
                    return False
                return False
        except Exception:
            return False

    async def _generate(
        self,
        prompt: str,
        system_prompt: str,
        config: ProviderConfig,
    ) -> ProviderResponse:
        model = config.model
        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt

        try:
            async with httpx.AsyncClient(timeout=config.timeout) as client:
                resp = await client.post(
                    f"{self._base_url}/api/generate",
                    json={
                        "model": model,
                        "prompt": full_prompt,
                        "stream": False,
                        "options": {
                            "temperature": config.temperature,
                            "top_p": config.top_p,
                            "num_predict": config.max_tokens,
                        }
                    },
                )

                if resp.status_code == 200:
                    text = resp.json().get("response", "").strip()
                    return ProviderResponse(
                        text=text,
                        model_used=model,
                        tokens_in=len(full_prompt) // 4,
                        tokens_out=len(text) // 4,
                    )
                else:
                    return ProviderResponse(
                        text="", model_used=model,
                        error=f"Ollama returned status {resp.status_code}"
                    )

        except httpx.TimeoutException:
            return ProviderResponse(text="", model_used=model, error="Ollama request timed out")
        except httpx.ConnectError:
            return ProviderResponse(
                text="", model_used=model,
                error=f"Ollama not reachable at {self._base_url}. Is Ollama running?"
            )
        except Exception as e:
            return ProviderResponse(text="", model_used=model, error=str(e))

    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding using Ollama (legacy compatibility)."""
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{self._base_url}/api/embeddings",
                    json={"model": self._config.model, "prompt": text},
                    timeout=30
                )
                if resp.status_code == 200:
                    return resp.json().get("embedding", [])
        except Exception as e:
            logger.error(f"Qwen embedding failed: {e}")
        return []


# ─── Factory ──────────────────────────────────────────────────────────────────

def create_qwen() -> QwenProvider:
    """Create the Qwen (local Ollama) provider — third in fallback chain."""
    ollama_host = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
    config = ProviderConfig(
        name="Qwen (Local)",
        api_key_env="OLLAMA_MODEL",  # Not really an API key, but used to check if model is configured
        model=os.getenv("OLLAMA_MODEL", "qwen2.5:7b"),
        base_url=ollama_host,
        max_tokens=int(os.getenv("QWEN_MAX_TOKENS", "1024")),
        temperature=float(os.getenv("AI_TEMPERATURE", "0.7")),
        is_free=True,      # Totally free (local)
        priority=3,        # Third in fallback chain (after DeepSeek)
        timeout=int(os.getenv("AI_TIMEOUT", "120")),  # Longer timeout for local models
    )
    # Qwen is enabled if Ollama is configured
    config.enabled = bool(os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434"))
    return QwenProvider(config)