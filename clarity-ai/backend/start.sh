#!/bin/bash
set -e

echo "=== Clarity AI Backend - Production Startup ==="

PORT="${PORT:-8080}"
ENV="${ENV:-production}"
LOG_LEVEL="${LOG_LEVEL:-INFO}"
CHROMA_DIR="${CHROMA_PERSIST_DIR:-/data/chroma_db}"

echo "  PORT=$PORT  ENV=$ENV  LOG=$LOG_LEVEL"

# Step 1: Ensure directories
echo "[1/3] Creating directories..."
mkdir -p "$CHROMA_DIR"
mkdir -p /data/uploads
echo "  Directories ready"

# Step 2: Verify API keys
echo "[2/3] Checking API keys..."
if [ -n "$GEMINI_API_KEY" ]; then echo "  Gemini: configured"; fi
if [ -n "$DEEPSEEK_API_KEY" ]; then echo "  DeepSeek: configured"; fi
if [ -n "$OPENAI_API_KEY" ]; then echo "  OpenAI: configured"; fi
if [ -n "$ANTHROPIC_API_KEY" ]; then echo "  Anthropic: configured"; fi

# Step 3: Start server
echo "[3/3] Starting FastAPI on port $PORT (1 worker)..."
exec uvicorn main:app \
    --host 0.0.0.0 \
    --port "$PORT" \
    --workers 1 \
    --log-level "$(echo "$LOG_LEVEL" | tr '[:upper:]' '[:lower:]')"
