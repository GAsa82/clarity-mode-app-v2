import httpx
import json
import logging
import re
import os
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")

async def check_ollama() -> bool:
    """Check if Ollama is running."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
            return response.status_code == 200
    except:
        return False

async def get_available_models() -> List[str]:
    """Get list of available models from Ollama."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5)
            if response.status_code == 200:
                data = response.json()
                return [m["name"] for m in data.get("models", [])]
    except:
        pass
    return []

async def generate_embedding(text: str, model: str = "qwen2.5:7b") -> List[float]:
    """Generate embedding using Ollama model."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/embeddings",
                json={"model": model, "prompt": text},
                timeout=30
            )
            if response.status_code == 200:
                return response.json().get("embedding", [])
    except Exception as e:
        logger.error(f"Ollama embedding failed: {e}")
    return []

async def chat_with_context(
    query: str,
    context_chunks: List[Dict[str, Any]],
    philosophy_chunks: Optional[List[Dict[str, Any]]] = None,
    model: str = DEFAULT_MODEL
) -> str:
    """Send a query with context to Ollama for answering."""
    if not context_chunks:
        return "I don't have enough diary entries to answer that yet. Please upload more diary pages first."

    diary_context = "\n\n".join([
        f"[From your diary, {c.get('metadata', {}).get('date', 'unknown date')}]: {c['document']}"
        for c in context_chunks[:8]
    ])

    philosophy_context = ""
    if philosophy_chunks:
        philosophy_context = "\n\n".join([
            f"[Your philosophy - {c.get('metadata', {}).get('category', 'insight')}]: {c['document']}"
            for c in philosophy_chunks[:3]
        ])

    system_prompt = (
        "You are Clarity AI, a personal diary intelligence assistant. "
        "You answer questions based on the user's own diary entries, writings, and personal philosophy.\n\n"
        "Rules:\n"
        "1. ALWAYS base your answers on the provided diary entries. If the entries don't contain relevant information, say so.\n"
        "2. Support Hindi, Hinglish, and English queries and respond in the same language.\n"
        "3. Identify emotional patterns, recurring themes, and beliefs from the entries.\n"
        "4. Be honest about contradictions you find in the user's thinking.\n"
        "5. Be supportive, non-judgmental, and insightful.\n"
        "6. Quote specific diary excerpts when relevant.\n"
        "7. If the user asks about personal growth, compare past and recent entries when available."
    )

    user_query = (
        f"Here are the relevant diary entries:\n\n{diary_context}\n\n"
        f"{philosophy_context + chr(10) if philosophy_context else ''}"
        f"User question: {query}\n\n"
        f"Please answer based on the above diary entries."
    )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": model,
                    "prompt": f"{system_prompt}\n\n{user_query}",
                    "stream": False,
                    "options": {
                        "temperature": 0.7,
                        "top_p": 0.9,
                        "max_tokens": 1024
                    }
                },
                timeout=60
            )
            if response.status_code == 200:
                return response.json().get("response", "").strip()
            else:
                return f"[Ollama returned status {response.status_code}]"
    except Exception as e:
        logger.error(f"Ollama chat failed: {e}")
        return f"[AI model unavailable: {str(e)}. Make sure Ollama is running.]"

async def extract_entities(text: str, model: str = DEFAULT_MODEL) -> Dict[str, Any]:
    """Use AI to extract emotions, themes, beliefs from text."""
    prompt = (
        'Analyze this diary entry and extract the following as JSON:\n'
        '{\n'
        '  "emotions": ["list of top 3-5 emotions"],\n'
        '  "themes": ["list of top 3-5 themes/topics"],\n'
        '  "beliefs": ["any expressed beliefs"],\n'
        '  "goals": ["any mentioned goals"],\n'
        '  "fears": ["any mentioned fears"],\n'
        '  "desires": ["any mentioned desires"],\n'
        '  "recurring_patterns": ["any patterns you notice"]\n'
        '}\n\n'
        f'Diary entry:\n{text[:2000]}\n\n'
        'Return ONLY valid JSON, no other text.'
    )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={"model": model, "prompt": prompt, "stream": False},
                timeout=30
            )
            if response.status_code == 200:
                text_response = response.json().get("response", "")
                try:
                    return json.loads(text_response)
                except:
                    match = re.search(r'\{.*\}', text_response, re.DOTALL)
                    if match:
                        return json.loads(match.group())
    except Exception as e:
        logger.error(f"Entity extraction failed: {e}")

    # Always return a valid dict
    return {"emotions": [], "themes": [], "beliefs": []}
