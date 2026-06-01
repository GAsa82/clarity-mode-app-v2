# Clarity Mode — Deployment Guide

## Architecture

```
Vercel (Frontend — static SPA)
  └── https://claritymode.vercel.app
        │
        │  API calls via VITE_API_URL
        ▼
Railway (Backend — FastAPI Python)
  └── https://your-project.railway.app
        ├── FastAPI + Uvicorn (4 workers)
        ├── ChromaDB (vector store, persistent volume)
        ├── sentence-transformers (embeddings)
        ├── Supabase (auth + PostgreSQL)
        └── 7 AI Providers with auto-fallback
```

## Prerequisites

1. **GitHub account** — push your repo
2. **Vercel account** — https://vercel.com
3. **Railway account** — https://railway.app
4. **Supabase project** — https://supabase.com
5. **At least one AI API key** — recommend Gemini (free tier)

---

## Step 1: Deploy Backend to Railway

### 1a. Push to GitHub
```bash
git add .
git commit -m "Ready for production"
git push
```

### 1b. Create Railway Project
1. Go to https://railway.app/new
2. Click **Deploy from GitHub repo**
3. Select your repository
4. Set **Root Directory** to `clarity-ai/backend`
5. Railway auto-detects `nixpacks.toml`, `requirements.txt`, `Procfile`, `start.sh`

### 1c. Configure Environment Variables
In Railway dashboard → Variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `ENV` | `production` | Enables production mode |
| `GEMINI_API_KEY` | `your-key` | At least one AI key required |
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | From Supabase Settings → API |
| `SUPABASE_ANON_KEY` | `your-anon-key` | From Supabase Settings → API |
| `ALLOWED_ORIGINS` | `https://claritymode.vercel.app` | Your Vercel frontend domain |
| `CHROMA_PERSIST_DIR` | `/data/chroma_db` | ChromaDB volume path |
| `UPLOADS_DIR` | `/data/uploads` | Upload storage path |
| `LOG_LEVEL` | `INFO` | Logging level |

### 1d. Create Railway Volume (for ChromaDB persistence)
1. Go to your Railway project → **Volumes**
2. Click **New Volume**
3. Name: `chroma-data`
4. Mount path: `/data`
5. Size: 1 GB (sufficient for 10,000+ diary entries)

### 1e. Verify Deployment
```bash
# Check health endpoint
curl https://your-project.railway.app/api/health

# Expected response:
{
  "status": "ok",
  "service": "Clarity AI",
  "checks": {
    "chromadb": "ok",
    "embeddings": "ok",
    "providers": "ok"
  }
}

# Check provider status
curl https://your-project.railway.app/api/chat/providers/status

# Test chat endpoint
curl -X POST https://your-project.railway.app/api/chat/ \
  -H "Content-Type: application/json" \
  -d '{"query": "Hello"}'
```

---

## Step 2: Deploy Frontend to Vercel

### 2a. Via Vercel Dashboard
1. Go to https://vercel.com/new
2. Import your GitHub repo
3. Set **Framework Preset** → `Vite`
4. **Build Command**: `npm run build`
5. **Output Directory**: `dist`
6. Add environment variables (below)
7. Click **Deploy**

### 2b. Set Vercel Environment Variables

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://your-project.railway.app/api` |
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `your-anon-key` |

### 2c. Verify Frontend
```bash
curl https://claritymode.vercel.app/          # Should return HTML
curl https://claritymode.vercel.app/login      # Should load login page
curl https://claritymode.vercel.app/admin      # Should redirect to login
```

---

## Step 3: Configure Supabase

### 3a. Create Project
1. Go to https://supabase.com → **New Project**
2. Note your **Project URL** and **anon key** from Settings → API

### 3b. Run Schema
1. Go to **SQL Editor**
2. Copy contents of `supabase-schema.sql`
3. Click **Run**

### 3c. Configure Auth
1. Go to **Authentication** → **Settings** → **Auth Providers**
2. Enable **Email** (passwordless sign-in)
3. Go to **URL Configuration**:
   - Site URL: `https://claritymode.vercel.app`
   - Redirect URLs: `https://claritymode.vercel.app/**`
   - Add: `https://claritymode.vercel.app/reset-password`

---

## Step 4: Verify Production Readiness

### Health Check
```bash
curl https://your-project.railway.app/api/health
# Expect: {"status":"ok", "checks":{"chromadb":"ok","embeddings":"ok","providers":"ok"}}
```

### AI Provider Chain
```bash
curl https://your-project.railway.app/api/chat/providers/status
# Expect:
#   Gemini Flash (enabled)
#   Qwen (Local) (disabled — no Ollama in production)
#   DeepSeek (disabled — no key)
#   etc.
```

### File Processing (RAG Pipeline)
The full pipeline is verified working:
```
Upload (.txt, .pdf, .jpg) → OCR (PaddleOCR/pdf2image) →
  Chunk (500-word overlap) → Embeddings (all-MiniLM-L6-v2) →
  ChromaDB (vector store) → Entity extraction (configurable AI provider)
  
Chat query → Embeddings → ChromaDB similarity search →
  Provider-agnostic AI (auto-fallback chain) → Response
```

### Auth Flow
```bash
# Login page loads
curl https://claritymode.vercel.app/login

# Admin pages are protected
curl https://claritymode.vercel.app/admin  # Redirects to /login

# Password reset available
curl https://claritymode.vercel.app/reset-password
```

---

## Step 5: Production Checklist

### Backend (Railway)
- [ ] `ENV=production` set
- [ ] At least one AI provider API key configured (`GEMINI_API_KEY`)
- [ ] `SUPABASE_URL` and `SUPABASE_ANON_KEY` set
- [ ] `CHROMA_PERSIST_DIR=/data/chroma_db` set
- [ ] Railway Volume "chroma-data" mounted at `/data`
- [ ] `ALLOWED_ORIGINS` includes your Vercel domain
- [ ] `start.sh` is executable
- [ ] Health endpoint returns `"status":"ok"`
- [ ] Provider status shows at least one enabled

### Frontend (Vercel)
- [ ] `VITE_API_URL` points to Railway backend
- [ ] `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set
- [ ] SPA routing works (all paths load index.html)
- [ ] Build completes without errors
- [ ] Cache headers configured (1 year for assets)

### Supabase
- [ ] SQL schema applied (profiles, diaries, upload_history tables)
- [ ] RLS policies enabled
- [ ] Auth configured with correct Site URL and redirects
- [ ] Email auth provider enabled

### Domain (Optional)
- [ ] Custom domain configured in Vercel
- [ ] Custom domain configured in Railway
- [ ] SSL certificates active
- [ ] DNS records updated

---

## Verifying AI Endpoints

### Test Chat
```bash
curl -X POST https://your-project.railway.app/api/chat/ \
  -H "Content-Type: application/json" \
  -d '{"query":"How are you?"}'
```
Expected response includes: `model_used`, `provider_name`, `fallback_occurred`, `latency_ms`

### Test Provider Dashboard
```bash
# Active provider stats
curl https://your-project.railway.app/api/chat/providers/stats

# Provider chain status
curl https://your-project.railway.app/api/chat/providers/status
```

### Test File Upload
```bash
# Upload a text file
curl -X POST https://your-project.railway.app/api/upload/ \
  -F "file=@test_diary.txt"
```
Expected: `{"status":"completed", "chunks_count":N}`

---

## Local Development

```bash
# Terminal 1: Start backend
cd clarity-ai/backend
python main.py
# → http://localhost:8000 | docs at /docs

# Terminal 2: Start frontend
npm run dev
# → http://localhost:8080 | API proxied to backend