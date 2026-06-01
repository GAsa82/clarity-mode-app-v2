#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
# Clarity AI — Railway Production Startup Script
# ══════════════════════════════════════════════════════════════════════════════
#
# This script handles:
# 1. Creating necessary directories
# 2. Pre-loading the embedding model (first-time download)
# 3. Establishing ChromaDB persistence
# 4. Starting the FastAPI server with uvicorn
#
# Environment variables (set in Railway dashboard):
#   PORT                    — Server port (Railway provides this, default: 8000)
#   ENV                     — "production" (default: development)
#   LOG_LEVEL               — "INFO" (default)
#   GEMINI_API_KEY          — Your Gemini API key (at minimum)
#   SUPABASE_URL            — Supabase project URL
#   SUPABASE_ANON_KEY       — Supabase anonymous key
#   CHROMA_PERSIST_DIR      — ChromaDB storage path (default: /data/chroma_db)
#   ALLOWED_ORIGINS         — CORS origins for your frontend domain
#   EMBEDDING_MODEL         — Sentence-transformers model (default: all-MiniLM-L6-v2)
# ══════════════════════════════════════════════════════════════════════════════

set -e  # Exit on error

# ─── Colors for output ───────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  Clarity AI Backend — Production Startup${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# ─── Configuration ───────────────────────────────────────────────────────────
PORT="${PORT:-8000}"
ENV="${ENV:-production}"
LOG_LEVEL="${LOG_LEVEL:-INFO}"
CHROMA_DIR="${CHROMA_PERSIST_DIR:-/data/chroma_db}"
EMBEDDING_MODEL="${EMBEDDING_MODEL:-all-MiniLM-L6-v2}"

echo -e "${YELLOW}Configuration:${NC}"
echo "  PORT            = $PORT"
echo "  ENV             = $ENV"
echo "  LOG_LEVEL       = $LOG_LEVEL"
echo "  CHROMA_DIR      = $CHROMA_DIR"
echo "  EMBEDDING_MODEL = $EMBEDDING_MODEL"
echo ""

# ─── Step 1: Ensure Directories ─────────────────────────────────────────────
echo -e "${YELLOW}[1/4] Creating directories...${NC}"
mkdir -p "$CHROMA_DIR"
mkdir -p /data/uploads
mkdir -p /app/logs
echo -e "${GREEN}  ✓ Directories created${NC}"

# ─── Step 2: Pre-Download Embedding Model ───────────────────────────────────
echo -e "${YELLOW}[2/4] Pre-loading embedding model...${NC}"
python -c "
from sentence_transformers import SentenceTransformer
print('  Downloading model: $EMBEDDING_MODEL...')
model = SentenceTransformer('$EMBEDDING_MODEL')
emb = model.encode('warmup', normalize_embeddings=True)
print(f'  ✓ Model loaded successfully (dimension={len(emb)})')
" 2>&1
echo -e "${GREEN}  ✓ Embedding model ready${NC}"

# ─── Step 3: Verify API Keys ─────────────────────────────────────────────────
echo -e "${YELLOW}[3/4] Checking API keys...${NC}"
if [ -n "$GEMINI_API_KEY" ]; then
    echo -e "${GREEN}  ✓ Gemini API key configured${NC}"
fi
if [ -n "$DEEPSEEK_API_KEY" ]; then
    echo -e "${GREEN}  ✓ DeepSeek API key configured${NC}"
fi
if [ -n "$OPENAI_API_KEY" ]; then
    echo -e "${GREEN}  ✓ OpenAI API key configured${NC}"
fi
if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo -e "${GREEN}  ✓ Anthropic API key configured${NC}"
fi
if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_ANON_KEY" ]; then
    echo -e "${GREEN}  ✓ Supabase configured${NC}"
fi

# ─── Step 4: Start Server ────────────────────────────────────────────────────
echo -e "${YELLOW}[4/4] Starting FastAPI server...${NC}"
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  Server starting on port ${PORT}${NC}"
echo -e "${CYAN}  Health check: /api/health${NC}"
echo -e "${CYAN}  API docs:     /docs${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

exec uvicorn main:app \
    --host 0.0.0.0 \
    --port "$PORT" \
    --log-level "$(echo "$LOG_LEVEL" | tr '[:upper:]' '[:lower:]')" \
    --workers 4 \
    --proxy-headers \
    --forwarded-allow-ips '*'