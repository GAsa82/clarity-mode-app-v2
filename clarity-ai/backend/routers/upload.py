"""
Upload router — processes diary uploads through the RAG pipeline.

Pipeline: Upload → OCR → Chunk → Embed → Store in ChromaDB → Extract entities via AI provider
"""
import os
import uuid
import logging
from typing import List
import aiofiles

from fastapi import APIRouter, UploadFile, File, HTTPException

from models.schemas import UploadResponse, BatchUploadResponse
from pipelines.ocr_pipeline import extract_text, allowed_file
from utils.text_chunker import chunk_text, extract_metadata, detect_language
from utils.embeddings import generate_embeddings
from database.chroma_client import add_diary_entry, get_entry_count, delete_entry, delete_entries_by_file_id
from providers import get_active_provider, PROVIDER_CHAIN
from services.supabase_client import save_diary_chunk, delete_diary_chunks_by_file

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/upload", tags=["Upload"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    if not allowed_file(file.filename):
        raise HTTPException(status_code=400, detail=f"File type not supported: {file.filename}")

    file_id = str(uuid.uuid4())
    safe_name = f"{file_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)

    # OCR extraction
    extracted_text = extract_text(file_path)
    if extracted_text.startswith("[OCR") or extracted_text.startswith("[PDF"):
        return UploadResponse(
            file_id=file_id,
            filename=file.filename,
            status="error",
            extracted_text=extracted_text,
            error=extracted_text
        )

    # Chunk
    chunks = chunk_text(extracted_text)
    if not chunks:
        return UploadResponse(
            file_id=file_id,
            filename=file.filename,
            status="completed",
            extracted_text=extracted_text,
            chunks_count=0
        )

    # Extract entities using the provider-agnostic AI layer
    entities = {"emotions": [], "themes": [], "beliefs": []}
    try:
        provider = get_active_provider()
        if provider:
            logger.info(f"Extracting entities using provider: {provider.name}")
            extracted = await provider.extract_entities(extracted_text)
            if extracted:
                entities = extracted
        else:
            logger.warning("No active AI provider for entity extraction — skipping")
    except Exception as e:
        logger.warning(f"Entity extraction failed (non-critical): {e}")

    base_meta = extract_metadata(extracted_text)
    language = detect_language(extracted_text)
    total_entries = get_entry_count()

    # Generate embeddings and store in ChromaDB + Supabase
    embeddings = generate_embeddings(chunks)
    emotions_str = ",".join(entities.get("emotions", []))
    themes_str = ",".join(entities.get("themes", []))
    beliefs_str = ",".join(entities.get("beliefs", []))

    for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
        chunk_id = f"{file_id}_chunk_{i}"
        meta = {
            **base_meta,
            "file_id": file_id,
            "filename": file.filename,
            "chunk_index": i,
            "total_chunks": len(chunks),
            "language": language,
            "date": str(uuid.uuid1().time),
            "emotions": emotions_str,
            "themes": themes_str,
            "beliefs": beliefs_str,
            "entry_number": total_entries + 1,
        }
        # Store in ChromaDB (fast search)
        add_diary_entry(chunk_id, chunk, emb, meta)
        # Store in Supabase (persistent across restarts)
        save_diary_chunk(
            chunk_id=chunk_id,
            file_id=file_id,
            filename=file.filename,
            chunk_index=i,
            total_chunks=len(chunks),
            text=chunk,
            embedding=emb,
            emotions=emotions_str,
            themes=themes_str,
            beliefs=beliefs_str,
            language=language,
            entry_number=total_entries + 1,
        )

    logger.info(f"Uploaded {file.filename}: {len(chunks)} chunks, lang={language}, entities_by={provider.name if provider else 'none'}")

    return UploadResponse(
        file_id=file_id,
        filename=file.filename,
        status="completed",
        extracted_text=extracted_text[:2000],
        chunks_count=len(chunks)
    )


@router.get("/documents")
async def list_documents():
    """Returns list of unique documents indexed in ChromaDB (Full Pipeline uploads only)."""
    from database.chroma_client import get_all_entries
    entries = get_all_entries()

    docs: dict = {}
    if entries and entries.get("metadatas"):
        for meta in entries["metadatas"]:
            if not meta or not isinstance(meta, dict):
                continue
            file_id = meta.get("file_id", "")
            filename = meta.get("filename", "unknown")
            if not file_id:
                continue
            if file_id not in docs:
                docs[file_id] = {
                    "file_id": file_id,
                    "filename": filename,
                    "chunks_count": 0,
                }
            docs[file_id]["chunks_count"] += 1

    result = sorted(docs.values(), key=lambda d: d["filename"])
    return {"documents": result, "total": len(result)}


@router.delete("/{file_id}")
async def delete_document(file_id: str):
    """Delete a document and all its chunks from ChromaDB and Supabase."""
    chroma_deleted = delete_entries_by_file_id(file_id)
    supabase_deleted = delete_diary_chunks_by_file(file_id)
    logger.info(f"Deleted file_id={file_id}: chroma={chroma_deleted} chunks, supabase={supabase_deleted}")
    return {
        "file_id": file_id,
        "status": "deleted",
        "chroma_chunks_removed": chroma_deleted,
        "supabase_deleted": supabase_deleted,
    }


@router.post("/batch", response_model=BatchUploadResponse)
async def upload_batch(files: List[UploadFile] = File(...)):
    results = []
    succeeded = 0
    failed = 0
    for file in files:
        try:
            result = await upload_file(file)
            results.append(result)
            if result.status == "completed":
                succeeded += 1
            else:
                failed += 1
        except Exception as e:
            results.append(UploadResponse(
                file_id="error",
                filename=file.filename,
                status="error",
                error=str(e)
            ))
            failed += 1
    return BatchUploadResponse(
        total=len(files),
        succeeded=succeeded,
        failed=failed,
        results=results
    )