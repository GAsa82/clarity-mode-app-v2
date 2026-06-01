import chromadb
from chromadb.config import Settings
import os
from typing import List, Dict, Any, Optional

CHROMA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "chroma_data")

# Collections
DIARY_COLLECTION = "clarity_diary"
PHILOSOPHY_COLLECTION = "clarity_philosophy"
PATTERNS_COLLECTION = "clarity_patterns"

_client = None

def get_client() -> chromadb.Client:
    global _client
    if _client is None:
        os.makedirs(CHROMA_PATH, exist_ok=True)
        _client = chromadb.PersistentClient(
            path=CHROMA_PATH,
            settings=Settings(anonymized_telemetry=False)
        )
    return _client

def get_or_create_collection(name: str):
    client = get_client()
    try:
        return client.get_collection(name)
    except:
        return client.create_collection(name)

def init_collections():
    """Initialize all required collections on startup."""
    for name in [DIARY_COLLECTION, PHILOSOPHY_COLLECTION, PATTERNS_COLLECTION]:
        get_or_create_collection(name)
    return True

def get_diary_collection():
    return get_or_create_collection(DIARY_COLLECTION)

def get_philosophy_collection():
    return get_or_create_collection(PHILOSOPHY_COLLECTION)

def get_patterns_collection():
    return get_or_create_collection(PATTERNS_COLLECTION)

def add_diary_entry(
    entry_id: str,
    text: str,
    embedding: List[float],
    metadata: Dict[str, Any]
):
    """Add a diary entry chunk to ChromaDB."""
    col = get_diary_collection()
    col.add(
        ids=[entry_id],
        embeddings=[embedding],
        metadatas=[metadata],
        documents=[text]
    )
    return entry_id

def search_diary(
    query_embedding: List[float],
    n_results: int = 10,
    filter_dict: Optional[Dict] = None
):
    """Search diary entries by embedding similarity."""
    col = get_diary_collection()
    results = col.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        where=filter_dict
    )
    return results

def get_all_entries():
    """Get all diary entries (for reports)."""
    col = get_diary_collection()
    return col.get()

def delete_entry(entry_id: str):
    """Delete a specific entry."""
    col = get_diary_collection()
    col.delete(ids=[entry_id])

def get_entry_count() -> int:
    """Get total number of diary entries."""
    col = get_diary_collection()
    return col.count()