"""
Clarity AI Backend - FastAPI Application
Diary Intelligence Platform with OCR, Vector Search, and RAG Chat

Railway production-ready configuration:
  - Single worker (SentenceTransformers/ChromaDB require process isolation)
  - Proxy headers for Railway load balancer
  - Comprehensive health checks
  - Graceful error handling
  - Request timeouts
"""
import os
import sys
import time
import logging
from pathlib import Path
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from dotenv import load_dotenv

# Load environment FIRST before any other imports that need env vars
load_dotenv()

from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from routers import upload, chat, dashboard
from providers import get_active_provider, chat_with_fallback, get_provider_stats, PROVIDER_CHAIN

# ─── Environment ─────────────────────────────────────────────────────────────
ENV = os.getenv("ENV", "development")
PORT = int(os.getenv("PORT", "8000"))
IS_PRODUCTION = ENV == "production"

# CORS allowlist. Production domains are always included so the
# production frontend never gets a CORS error even if ALLOWED_ORIGINS
# is left blank in the deploy platform.
PRODUCTION_ORIGINS = [
    "https://claritymode.vercel.app",
    "https://claritymode.com",
    "https://www.claritymode.com",
]
DEV_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8080",
    "http://localhost:8081",
]
env_origins_raw = os.getenv("ALLOWED_ORIGINS", "")
env_origins = [o.strip() for o in env_origins_raw.split(",") if o.strip()]
ALLOWED_ORIGINS = list(dict.fromkeys(env_origins + PRODUCTION_ORIGINS + DEV_ORIGINS))

# Log CORS configuration on startup so deployment issues are visible
print(f"[clarity-ai] CORS allowed origins: {ALLOWED_ORIGINS}")
print(f"[clarity-ai] Environment: {ENV}")
print(f"[clarity-ai] Port: {PORT}")
# Warn on missing API keys
if not (os.getenv("GEMINI_API_KEY") or os.getenv("DEEPSEEK_API_KEY")
        or os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY")):
    print("[clarity-ai] WARNING: No AI provider API keys configured! Chat will fail.")

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:7b")

# ChromaDB persistence (critical for Railway volumes)
CHROMA_PERSIST_DIR = os.getenv(
    "CHROMA_PERSIST_DIR", os.path.join(os.path.dirname(__file__), "chroma_db")
)

# Upload directory
UPLOADS_DIR = Path(
    os.getenv(
        "UPLOADS_DIR",
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads"),
    )
)

# ─── Logging Setup ───────────────────────────────────────────────────────────
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_DIR = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

log_format = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
date_format = "%Y-%m-%d %H:%M:%S"

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format=log_format,
    datefmt=date_format,
    handlers=[
        logging.StreamHandler(sys.stdout),
        *(
            [logging.FileHandler(LOG_DIR / "clarity-ai.log", encoding="utf-8")]
            if not IS_PRODUCTION
            else []
        ),
    ],
)

logger = logging.getLogger("clarity-ai")
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("watchfiles").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)

# ─── Application State ───────────────────────────────────────────────────────
app_state = {
    "start_time": None,
    "chromadb_ready": False,
    "ollama_ready": False,
    "providers_ready": False,
    "embedding_model_ready": False,
    "total_requests": 0,
    "total_errors": 0,
}


# ─── Lifespan ────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    app_state["start_time"] = datetime.now(timezone.utc)

    logger.info("=" * 60)
    logger.info("Clarity AI Backend starting up...")
    logger.info(f"  Environment     : {ENV}")
    logger.info(f"  Port            : {PORT}")
    logger.info(f"  Log level       : {LOG_LEVEL}")
    logger.info(f"  ChromaDB dir    : {CHROMA_PERSIST_DIR}")
    logger.info(f"  Uploads dir     : {UPLOADS_DIR}")
    logger.info(f"  CORS origins    : {len(ALLOWED_ORIGINS)} configured")
    logger.info(f"  Provider chain  : {len(PROVIDER_CHAIN)} providers")
    for p in PROVIDER_CHAIN:
        status = "ENABLED" if p.enabled else "DISABLED (no key)"
        logger.info(f"    [{p.config.priority}] {p.name} ({p.config.model}) {status}")
    logger.info("=" * 60)

    os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)

    # Check ChromaDB
    try:
        os.environ["CHROMA_PERSIST_DIR"] = CHROMA_PERSIST_DIR
        from database.chroma_client import get_client, init_collections

        client = get_client()
        init_collections()
        app_state["chromadb_ready"] = True
        logger.info(f"ChromaDB initialized ({CHROMA_PERSIST_DIR})")
    except Exception as e:
        logger.error(f"ChromaDB initialization failed: {e}")

    # Check Ollama
    try:
        from utils.ollama_client import check_ollama

        ollama_ok = await check_ollama()
        app_state["ollama_ready"] = ollama_ok
        if ollama_ok:
            logger.info("Ollama is reachable")
        else:
            logger.info("Ollama not configured - cloud providers will be used instead")
    except Exception as e:
        logger.warning(f"Ollama check failed (non-critical): {e}")

    # Check embedding model
    try:
        from utils.embeddings import generate_embedding

        test_emb = generate_embedding("test")
        app_state["embedding_model_ready"] = len(test_emb) > 0
        logger.info(f"Embedding model loaded (dimension={len(test_emb)})")
    except Exception as e:
        logger.error(f"Embedding model failed to load: {e}")

    configured_providers = [p.name for p in PROVIDER_CHAIN if p.enabled]
    app_state["providers_ready"] = len(configured_providers) > 0
    if configured_providers:
        logger.info(f"Active providers: {', '.join(configured_providers)}")
    else:
        logger.warning("No AI providers configured - set GEMINI_API_KEY or another API key")

    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    logger.info(f"Uploads directory: {UPLOADS_DIR}")

    logger.info("=" * 60)
    logger.info("Clarity AI Backend is ready!")
    logger.info("=" * 60)

    yield

    logger.info("Clarity AI Backend shutting down...")


# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Clarity AI",
    description="Personal Diary Intelligence Platform with OCR, Vector Search & RAG",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if not IS_PRODUCTION else None,
    redoc_url="/redoc" if not IS_PRODUCTION else None,
)

# ─── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Trusted Hosts (production) ──────────────────────────────────────────────
if IS_PRODUCTION:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=[
            "claritymode.vercel.app",
            "claritymode.com",
            "www.claritymode.com",
            "*.railway.app",
            "*.up.railway.app",
        ],
    )

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# ─── Register routers ────────────────────────────────────────────────────────
app.include_router(upload.router)
app.include_router(chat.router)
app.include_router(dashboard.router)


# ─── Request logging middleware ──────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log every request with timing."""
    start = time.time()
    app_state["total_requests"] += 1

    if IS_PRODUCTION and request.url.path == "/api/health":
        try:
            response = await call_next(request)
            return response
        except Exception as e:
            app_state["total_errors"] += 1
            return JSONResponse(status_code=500, content={"status": "error", "detail": str(e)})

    try:
        response = await call_next(request)
        duration = (time.time() - start) * 1000
        logger.info(
            f"{request.method} {request.url.path} -> {response.status_code} ({duration:.0f}ms)"
        )
        return response
    except Exception as e:
        app_state["total_errors"] += 1
        duration = (time.time() - start) * 1000
        logger.error(
            f"{request.method} {request.url.path} -> ERROR ({duration:.0f}ms): {e}"
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "error": str(e) if not IS_PRODUCTION else "An unexpected error occurred"},
        )


# ─── Global exception handler ───────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler."""
    app_state["total_errors"] += 1
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error": str(exc) if not IS_PRODUCTION else "An unexpected error occurred",
        },
    )


# ─── Simple upload endpoint ─────────────────────────────────────────────────
@app.post("/api/upload-diary")
async def upload_diary(file: UploadFile = File(...)):
    """Simple MVP upload endpoint. Accepts an image file, saves it, returns success."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".txt"}
    ext = Path(file.filename).suffix.lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(allowed_extensions))}",
        )

    safe_name = f"{os.urandom(4).hex()}_{file.filename}"
    file_path = UPLOADS_DIR / safe_name
    content = await file.read()

    try:
        with open(file_path, "wb") as f:
            f.write(content)
    except IOError as e:
        logger.error(f"Failed to save file: {e}")
        raise HTTPException(status_code=500, detail="Failed to save file")

    logger.info(f"Uploaded: {file.filename} -> {safe_name} ({len(content)} bytes)")

    return {
        "success": True,
        "filename": file.filename,
        "saved_as": safe_name,
        "size_bytes": len(content),
        "message": "File uploaded successfully.",
    }


# ─── Health check ────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    """Comprehensive health check endpoint - used by Railway for liveness probes."""
    uptime = None
    if app_state["start_time"]:
        uptime = (datetime.now(timezone.utc) - app_state["start_time"]).total_seconds()

    provider_info = {}
    for p in PROVIDER_CHAIN:
        provider_info[p.name] = {
            "enabled": p.enabled,
            "model": p.config.model,
            "free": p.config.is_free,
            "priority": p.config.priority,
        }

    return {
        "status": "ok",
        "version": "1.0.0",
        "service": "Clarity AI",
        "environment": ENV,
        "uptime_seconds": round(uptime, 1) if uptime else None,
        "checks": {
            "chromadb": "ok" if app_state["chromadb_ready"] else "error",
            "embeddings": "ok" if app_state["embedding_model_ready"] else "error",
            "providers": "ok" if app_state["providers_ready"] else "degraded",
            "ollama": "ok" if app_state["ollama_ready"] else "not_configured",
        },
        "stats": {
            "total_requests": app_state["total_requests"],
            "total_errors": app_state["total_errors"],
        },
        "providers": provider_info,
    }


# ─── Root ────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "service": "Clarity AI API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health",
    }


# ─── Serve frontend static files in production ──────────────────────────────
FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")
    logger.info(f"Serving frontend from {FRONTEND_DIST}")
else:
    logger.info("Frontend dist not found. Only serving API.")


# ─── Entry point ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    reload = not IS_PRODUCTION
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=PORT,
        reload=reload,
        log_level=LOG_LEVEL.lower(),
        workers=1,
        proxy_headers=True,
        forwarded_allow_ips="*",
    )
