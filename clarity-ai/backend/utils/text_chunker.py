from typing import List, Dict, Any
import re


def chunk_text(text: str, chunk_size: int = 600, overlap: int = 80) -> List[str]:
    """
    Structure-aware chunker.

    Priority:
    1. Split on explicit section boundaries (---, Page N, double blank lines)
    2. Within each section split on single blank lines (paragraphs)
    3. If a paragraph is still too long, split on sentences
    4. Only word-split as last resort
    """
    if not text or not text.strip():
        return []

    # ── Step 1: section-level splits ─────────────────────────────────────────
    section_pattern = re.compile(
        r'(?:^---\s*Page\s*\d+\s*---$|^={3,}$|^-{3,}$)',
        re.MULTILINE | re.IGNORECASE,
    )
    sections = [s.strip() for s in section_pattern.split(text) if s.strip()]
    if not sections:
        sections = [text.strip()]

    chunks: List[str] = []

    for section in sections:
        # ── Step 2: paragraph-level splits ───────────────────────────────────
        paragraphs = [p.strip() for p in re.split(r'\n{2,}', section) if p.strip()]
        if not paragraphs:
            paragraphs = [section]

        current_chunk: List[str] = []
        current_len = 0

        for para in paragraphs:
            para_words = para.split()
            para_len = len(para_words)

            if para_len > chunk_size:
                # Flush current buffer first
                if current_chunk:
                    chunks.append('\n\n'.join(current_chunk))
                    current_chunk = []
                    current_len = 0
                # Split long paragraph on sentences
                sentences = re.split(r'(?<=[.!?।])\s+', para)
                sent_buf: List[str] = []
                sent_len = 0
                for sent in sentences:
                    sw = len(sent.split())
                    if sent_len + sw > chunk_size and sent_buf:
                        chunks.append(' '.join(sent_buf))
                        # overlap: keep last sentence
                        sent_buf = sent_buf[-1:] if overlap > 0 else []
                        sent_len = len(sent_buf[0].split()) if sent_buf else 0
                    sent_buf.append(sent)
                    sent_len += sw
                if sent_buf:
                    chunks.append(' '.join(sent_buf))
                continue

            if current_len + para_len > chunk_size and current_chunk:
                chunks.append('\n\n'.join(current_chunk))
                # keep last paragraph as overlap context
                if overlap > 0 and current_chunk:
                    current_chunk = [current_chunk[-1]]
                    current_len = len(current_chunk[0].split())
                else:
                    current_chunk = []
                    current_len = 0

            current_chunk.append(para)
            current_len += para_len

        if current_chunk:
            chunks.append('\n\n'.join(current_chunk))

    return [c for c in chunks if c.strip()]


def extract_metadata(text: str) -> Dict[str, Any]:
    """Extract basic metadata from text — preserves original casing and structure."""
    return {
        "word_count": len(text.split()),
        "char_count": len(text),
        "has_hindi": bool(re.search(r'[ऀ-ॿ]', text)),
        "has_hinglish": bool(re.search(
            r'\b(kya|hai|nahi|hain|tha|the|ho|ka|ki|ke|mein|se|ko|par|aur|ya|to|bhi|hi|na|jo|wo|woh|is|us|un|in|mera|tera|apna|kuch|sab|bahut|thoda|acha|accha|theek|sahi|galat|aap|tum|hum|main)\b',
            text, re.IGNORECASE,
        )),
    }


def detect_language(text: str) -> str:
    hindi_chars = len(re.findall(r'[ऀ-ॿ]', text))
    total_chars = len(text.strip())
    if total_chars == 0:
        return "unknown"
    ratio = hindi_chars / total_chars
    if ratio > 0.3:
        return "hindi"
    elif ratio > 0.05:
        return "hinglish"
    return "english"
