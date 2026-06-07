"""
Upload router — processes diary uploads through the RAG pipeline.

Pipeline: Upload → OCR → Chunk → Embed → Store in ChromaDB → Extract entities via AI provider
"""
import os
import uuid
import logging
from typing import List
import aiofiles

from fastapi import APIRouter, UploadFile, File, HTTPException, Request

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

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/", response_model=UploadResponse)
async def upload_file(request: Request, file: UploadFile = File(...)):
    if not allowed_file(file.filename):
        raise HTTPException(status_code=400, detail=f"File type not supported: {file.filename}")

    # BUG-01 fix: extract user_id from JWT for data isolation
    user_id = ""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            from services.supabase_client import verify_token
            token_info = verify_token(auth_header[7:])
            if token_info:
                user_id = token_info["id"]
        except Exception:
            pass

    file_id = str(uuid.uuid4())
    safe_name = f"{file_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    # BUG-07 fix: enforce 10 MB file size limit
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum allowed size is 10 MB.")

    async with aiofiles.open(file_path, 'wb') as f:
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
    provider = None
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

    # Flatten all rich entity fields into searchable strings
    def _join(lst) -> str:
        if isinstance(lst, list):
            return ",".join(str(x) for x in lst if x)
        return str(lst) if lst else ""

    emotions_str  = _join(entities.get("emotions", []))
    themes_str    = _join(entities.get("themes", []))
    beliefs_str   = _join(entities.get("beliefs", []))

    # Extra rich fields from new entity extraction
    doc_type      = entities.get("document_type", "")
    achievements  = _join(entities.get("achievements", []))
    strengths     = _join(entities.get("strengths", []))
    growth_areas  = _join(entities.get("areas_for_growth", []))
    key_facts     = _join(entities.get("key_facts", []))
    remarks       = _join(entities.get("descriptive_remarks", []))
    summary       = entities.get("summary", "")

    # skills_assessed is a dict — flatten to "skill:grade, ..." string
    skills_raw = entities.get("skills_assessed", {})
    skills_str = ",".join(f"{k}:{v}" for k, v in skills_raw.items()) if isinstance(skills_raw, dict) else ""

    # Generate embeddings and store in ChromaDB + Supabase
    embeddings = generate_embeddings(chunks)

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
            "emotions":     emotions_str,
            "themes":       themes_str,
            "beliefs":      beliefs_str,
            "doc_type":     doc_type,
            "achievements": achievements,
            "strengths":    strengths,
            "growth_areas": growth_areas,
            "key_facts":    key_facts,
            "remarks":      remarks,
            "skills":       skills_str,
            "summary":      summary,
            "entry_number": total_entries + 1,
            "user_id":      user_id,
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
            user_id=user_id,
        )

    # ── Store a special SUMMARY CHUNK for the whole document ─────────────────
    # This chunk contains ALL extracted fields in human-readable form.
    # It ensures that when a user asks about ANY part of the document
    # (e.g. "what's my emotional skills"), it's always findable via semantic search.
    summary_lines = [f"Document: {file.filename}"]
    if doc_type:      summary_lines.append(f"Document type: {doc_type}")
    if summary:       summary_lines.append(f"Summary: {summary}")
    if skills_str:    summary_lines.append(f"Skills assessed: {skills_str}")
    if achievements:  summary_lines.append(f"Achievements: {achievements}")
    if strengths:     summary_lines.append(f"Strengths: {strengths}")
    if growth_areas:  summary_lines.append(f"Areas for growth: {growth_areas}")
    if key_facts:     summary_lines.append(f"Key facts: {key_facts}")
    if remarks:       summary_lines.append(f"Descriptive remarks: {remarks}")
    if emotions_str:  summary_lines.append(f"Emotions: {emotions_str}")
    if themes_str:    summary_lines.append(f"Themes: {themes_str}")
    if beliefs_str:   summary_lines.append(f"Beliefs: {beliefs_str}")
    # Include enough raw text to cover all sections (life skills etc. may be mid-doc)
    summary_lines.append(f"Full text excerpt: {extracted_text[:4000]}")
    summary_text = "\n".join(summary_lines)

    summary_meta = {
        **base_meta,
        "file_id":      file_id,
        "filename":     file.filename,
        "chunk_index":  -1,
        "total_chunks": len(chunks),
        "language":     language,
        "date":         str(uuid.uuid1().time),
        "is_summary":   "true",
        "doc_type":     doc_type,
        "emotions":     emotions_str,
        "themes":       themes_str,
        "beliefs":      beliefs_str,
        "achievements": achievements,
        "strengths":    strengths,
        "growth_areas": growth_areas,
        "key_facts":    key_facts,
        "remarks":      remarks,
        "skills":       skills_str,
        "summary":      summary,
        "entry_number": total_entries + 1,
        "user_id":      user_id,
    }
    summary_emb = generate_embeddings([summary_text])[0] if summary_text else embeddings[0]
    add_diary_entry(f"{file_id}_summary", summary_text, summary_emb, summary_meta)

    logger.info(f"Uploaded {file.filename}: {len(chunks)} chunks + 1 summary, lang={language}, doc_type={doc_type}, entities_by={provider.name if provider else 'none'}")

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