import chromadb
from chromadb.config import Settings
import os
from typing import List, Dict, Any, Optional

CHROMA_PATH = os.environ.get(
    "CHROMA_PERSIST_DIR",
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "chroma_data"),
)

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
            settings=Settings(anonymized_telemetry=False),
        )
    return _client


def get_or_create_collection(name: str):
    """Get or create a collection with NO default embedding function.

    We always supply pre-computed embeddings, so we set embedding_function=None
    to prevent chromadb from loading sentence-transformers/ONNX models at startup.
    """
    client = get_client()
    try:
        return client.get_collection(name, embedding_function=None)
    except Exception:
        return client.create_collection(name, embedding_function=None)


def init_collections():
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
    metadata: Dict[str, Any],
):
    col = get_diary_collection()
    col.upsert(
        ids=[entry_id],
        embeddings=[embedding],
        metadatas=[metadata],
        documents=[text],
    )
    return entry_id


def search_diary(
    query_embedding: List[float],
    n_results: int = 10,
    filter_dict: Optional[Dict] = None,
):
    col = get_diary_collection()
    count = col.count()
    if count == 0:
        return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}
    actual_n = min(n_results, count)
    return col.query(
        query_embeddings=[query_embedding],
        n_results=actual_n,
        where=filter_dict,
    )


def get_all_entries():
    col = get_diary_collection()
    return col.get()


def delete_entry(entry_id: str):
    col = get_diary_collection()
    col.delete(ids=[entry_id])


def delete_entries_by_file_id(file_id: str) -> int:
    """Delete all chunks for a given file_id. Returns number of chunks deleted."""
    col = get_diary_collection()
    try:
        existing = col.get(where={"file_id": {"$eq": file_id}})
        ids_to_delete = existing.get("ids", [])
        if ids_to_delete:
            col.delete(ids=ids_to_delete)
        return len(ids_to_delete)
    except Exception:
        return 0


def get_entry_count() -> int:
    col = get_diary_collection()
    return col.count()
