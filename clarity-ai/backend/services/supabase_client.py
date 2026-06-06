"""
Supabase client for Clarity AI Backend.
Provides:
1. Auth token verification (JWT validation)
2. User profile and diary CRUD operations
3. Upload history tracking
"""

import os
import logging
from typing import Optional
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

logger = logging.getLogger(__name__)

# ─── Client ────────────────────────────────────────────────────────────────────

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")

_supabase: Optional[Client] = None


def get_client() -> Optional[Client]:
    """Get or create the Supabase admin client (uses service role key)."""
    global _supabase
    if _supabase is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            logger.warning("Supabase not configured (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing)")
            return None
        _supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _supabase


def is_available() -> bool:
    """Check if Supabase is configured."""
    return bool(SUPABASE_URL and SUPABASE_SERVICE_KEY)


# ─── Auth Verification ─────────────────────────────────────────────────────────

def verify_token(token: str) -> Optional[dict]:
    """
    Verify a Supabase JWT token and return the user info.
    Returns None if invalid.
    """
    client = get_client()
    if not client:
        return None

    try:
        # Use the admin client to get the user by JWT
        user = client.auth.get_user(token)
        if user and user.user:
            return {
                "id": user.user.id,
                "email": user.user.email,
                "role": user.user.role or "authenticated",
            }
    except Exception as e:
        logger.warning(f"Token verification failed: {e}")

    return None


# ─── Profile Operations ────────────────────────────────────────────────────────

async def get_profile(user_id: str) -> Optional[dict]:
    """Get user profile from Supabase."""
    client = get_client()
    if not client:
        return None

    try:
        result = client.table("profiles").select("*").eq("id", user_id).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
    except Exception as e:
        logger.error(f"Failed to get profile: {e}")

    return None


# ─── Diary Operations ──────────────────────────────────────────────────────────

async def save_diary(
    user_id: str,
    file_id: str,
    filename: str,
    file_size_bytes: int,
    extracted_text: str,
    chunks_count: int,
    chunk_ids: list,
    entities: dict,
    language: str,
    word_count: int,
) -> Optional[str]:
    """
    Save a diary entry to Supabase.
    Returns the diary UUID or None on failure.
    """
    client = get_client()
    if not client:
        return None

    try:
        result = client.table("diaries").insert({
            "user_id": user_id,
            "file_id": file_id,
            "filename": filename,
            "file_size_bytes": file_size_bytes,
            "status": "completed",
            "extracted_text": extracted_text[:50000],  # limit text length
            "text_length": len(extracted_text),
            "chunks_count": chunks_count,
            "chunk_ids": chunk_ids,
            "entities": entities,
            "language": language,
            "word_count": word_count,
            "processed_at": "now()",
        }).execute()

        if result.data and len(result.data) > 0:
            diary_id = result.data[0]["id"]
            logger.info(f"Saved diary {diary_id} for user {user_id}")
            return str(diary_id)
    except Exception as e:
        logger.error(f"Failed to save diary: {e}")

    return None


async def get_user_diaries(user_id: str, limit: int = 50) -> list:
    """Get all diaries for a user."""
    client = get_client()
    if not client:
        return []

    try:
        result = client.table("diaries") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("uploaded_at", desc=True) \
            .limit(limit) \
            .execute()
        return result.data or []
    except Exception as e:
        logger.error(f"Failed to get diaries: {e}")

    return []


async def get_diary_count(user_id: str) -> int:
    """Get total diary count for a user."""
    client = get_client()
    if not client:
        return 0

    try:
        result = client.table("diaries") \
            .select("id", count="exact") \
            .eq("user_id", user_id) \
            .execute()
        return result.count or 0
    except Exception as e:
        logger.error(f"Failed to count diaries: {e}")

    return 0


# ─── Upload History Operations ─────────────────────────────────────────────────

async def save_upload_history(
    user_id: str,
    diary_id: Optional[str],
    filename: str,
    file_size_bytes: int,
    file_type: Optional[str],
    status: str,
    status_message: Optional[str] = None,
    chunks_created: int = 0,
    ocr_success: bool = False,
    embedding_success: bool = False,
) -> Optional[str]:
    """Save an upload history entry."""
    client = get_client()
    if not client:
        return None

    try:
        result = client.table("upload_history").insert({
            "user_id": user_id,
            "diary_id": diary_id,
            "filename": filename,
            "file_size_bytes": file_size_bytes,
            "file_type": file_type,
            "status": status,
            "status_message": status_message,
            "chunks_created": chunks_created,
            "ocr_success": ocr_success,
            "embedding_success": embedding_success,
            "completed_at": "now()" if status in ("completed", "failed") else None,
        }).execute()

        if result.data and len(result.data) > 0:
            return str(result.data[0]["id"])
    except Exception as e:
        logger.error(f"Failed to save upload history: {e}")

    return None


# ─── Diary Chunk Persistence (survives Railway restarts) ──────────────────────

def save_diary_chunk(
    chunk_id: str,
    file_id: str,
    filename: str,
    chunk_index: int,
    total_chunks: int,
    text: str,
    embedding: list,
    emotions: str,
    themes: str,
    beliefs: str,
    language: str,
    entry_number: int,
) -> bool:
    """Upsert a single diary chunk to Supabase for cross-restart persistence."""
    client = get_client()
    if not client:
        return False
    try:
        client.table("diary_entries").upsert({
            "id": chunk_id,
            "file_id": file_id,
            "filename": filename,
            "chunk_index": chunk_index,
            "total_chunks": total_chunks,
            "text": text,
            "embedding": embedding,
            "emotions": emotions,
            "themes": themes,
            "beliefs": beliefs,
            "language": language,
            "entry_number": entry_number,
        }).execute()
        return True
    except Exception as e:
        logger.error(f"Failed to save diary chunk {chunk_id}: {e}")
        return False


def load_all_diary_chunks() -> list:
    """Load all diary chunks from Supabase (for re-indexing ChromaDB on startup)."""
    client = get_client()
    if not client:
        return []
    try:
        result = client.table("diary_entries").select("*").order("created_at").execute()
        return result.data or []
    except Exception as e:
        logger.error(f"Failed to load diary chunks: {e}")
        return []


def delete_diary_chunks_by_file(file_id: str) -> bool:
    """Delete all chunks for a file from Supabase."""
    client = get_client()
    if not client:
        return False
    try:
        client.table("diary_entries").delete().eq("file_id", file_id).execute()
        return True
    except Exception as e:
        logger.error(f"Failed to delete diary chunks for {file_id}: {e}")
        return False


async def get_upload_history(user_id: str, limit: int = 20) -> list:
    """Get upload history for a user."""
    client = get_client()
    if not client:
        return []

    try:
        result = client.table("upload_history") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("started_at", desc=True) \
            .limit(limit) \
            .execute()
        return result.data or []
    except Exception as e:
        logger.error(f"Failed to get upload history: {e}")

    return []