from typing import List, Dict, Any
import re

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """Split text into overlapping chunks."""
    if not text or not text.strip():
        return []

    # Clean text
    text = re.sub(r'\s+', ' ', text).strip()
    words = text.split()

    if len(words) <= chunk_size:
        return [text]

    chunks = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = ' '.join(words[start:end])
        if chunk.strip():
            chunks.append(chunk)
        start += chunk_size - overlap

    return chunks

def extract_metadata(text: str) -> Dict[str, Any]:
    """Extract basic metadata from text."""
    metadata = {
        "word_count": len(text.split()),
        "char_count": len(text),
        "has_hindi": bool(re.search(r'[\u0900-\u097F]', text)),
        "has_hinglish": bool(re.search(r'\b(kya|hai|nahi|hain|tha|the|ho|ka|ki|ke|mein|se|ko|par|aur|ya|to|bhi|hi|na|jo|wo|woh|is|us|un|in|mera|tera|apna|kuch|sab|bahut|thoda|acha|accha|theek|sahi|galat|aap|tum|hum|main)\b', text, re.IGNORECASE)),
    }
    return metadata

def detect_language(text: str) -> str:
    """Detect if text is Hindi, Hinglish, or English."""
    hindi_chars = len(re.findall(r'[\u0900-\u097F]', text))
    total_chars = len(text.strip())

    if total_chars == 0:
        return "unknown"

    hindi_ratio = hindi_chars / total_chars

    if hindi_ratio > 0.3:
        return "hindi"
    elif hindi_ratio > 0.05:
        return "hinglish"
    else:
        return "english"