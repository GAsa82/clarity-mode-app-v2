# Clarity Mode — Production Deployment Guide

This is the complete production deployment guide for the Clarity Mode app (Vercel frontend + Railway backend).

---

## 🏗️ Architecture

```
┌──────────────────────┐      ┌──────────────────────────┐
│   VERCEL (Frontend)  │ ───▶ │  RAILWAY (Backend API)   │
│   React + Vite       │      │  FastAPI + Python        │
│   Static + CDN       │      │  ChromaDB + AI providers │
└──────────────────────┘      └──────────────────────────┘
         ▲                                 ▲
         │                                 │
         └──── Supabase (Auth + DB) ───────┘
```

| Service | Platform | Purpose |
|---|---|---|
| Frontend | Vercel | Static React app, CDN-served |
| Backend | Railway | FastAPI + ChromaDB + AI providers |
| Auth + DB | Supabase | User accounts, profiles, diary metadata |
| Vector Store | Railway Volume | ChromaDB embeddings (persisted) |

---

## 🔐 Environment Variables

### Frontend (Vercel → Project Settings → Environment Variables)

| Variable | Required | Description | Example |
|---|---|---|---|
| `VITE_API_URL` | ✅ | Full backend URL, no trailing slash | `https://clarity-ai-prod.up.railway.app` |
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon public key | `eyJhbGciOiJIUzI1...` |
| `VITE_SITE_URL` | ✅ | Frontend URL for auth redirects | `https://claritymode.vercel.app` |

### Backend (Railway → Variables Tab)

| Variable | Required | Description | Default |
|---|---|---|---|
| `ENV` | ✅ | Set to `production` | `production` |
| `PORT` | ❌ | Railway auto-assigns | `8000` |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated CORS allowlist | (see below) |
| `LOG_LEVEL` | ❌ | `INFO` recommended | `INFO` |
| `GEMINI_API_KEY` | ✅ | At least one AI key | from aistudio.google.com |
| `DEEPSEEK_API_KEY` | ✅ | At least one AI key | from platform.deepseek.com |
| `OPENAI_API_KEY` | ❌ | Optional fallback | from platform.openai.com |
| `OPENROUTER_API_KEY` | ❌ | Optional | from openrouter.ai |
| `ANTHROPIC_API_KEY` | ❌ | Optional | from console.anthropic.com |
| `SUPABASE_URL` | ✅ | For profile queries | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | ✅ | For profile queries | (anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | Admin ops only | (service role key) |
| `CHROMA_PERSIST_DIR` | ✅ | Use a Railway Volume path | `/data/chroma_db` |
| `UPLOADS_DIR` | ✅ | Use a Railway Volume path | `/data/uploads` |
| `EMBEDDING_MODEL` | ❌ | Sentence-transformers model | `all-MiniLM-L6-v2` |
| `SITE_URL` | ❌ | Frontend URL for CORS | (matches Vercel URL) |

**`ALLOWED_ORIGINS` example:**
```
https://claritymode.vercel.app,https://claritymode.com,https://www.claritymode.com
```

---

## 🚀 Step 1 — Deploy Backend to Railway

### 1.1 Create Railway Project
1. Go to [railway.app](https://railway.app/) → **New Project** → **Deploy from GitHub repo**
2. Select your repo
3. Set the **Root Directory** to `clarity-ai/backend`

### 1.2 Add a Volume (for ChromaDB persistence)
1. In your Railway service → **Settings** → **Volumes**
2. Click **+ New Volume**
3. Mount path: `/data`
4. This persists ChromaDB data across deployments

### 1.3 Set Environment Variables
1. In your Railway service → **Variables** tab
2. Copy the values from `clarity-ai/backend/.env.railway` (replace placeholders with real keys)

### 1.4 Deploy
- Railway will auto-deploy using `railway.json` and `start.sh`
- Watch the logs for the startup banner:
  ```
  [clarity-ai] CORS allowed origins: [...]
  [clarity-ai] ✓ ChromaDB initialized
  [clarity-ai] ✓ Active providers: Gemini Flash, DeepSeek, ...
  Clarity AI Backend is ready!
  ```

### 1.5 Get Your Backend URL
- Go to **Settings** → **Domains** → **Generate Domain**
- Copy the URL (e.g., `https://clarity-ai-production.up.railway.app`)

### 1.6 Verify Health
```bash
curl https://clarity-ai-production.up.railway.app/api/health
```
Should return `{"status":"ok",...}`.

---

## 🌐 Step 2 — Deploy Frontend to Vercel

### 2.1 Connect Repo
1. Go to [vercel.com](https://vercel.com/) → **Add New Project**
2. Import your GitHub repo
3. Framework Preset: **Vite** (auto-detected)
4. Root Directory: `./` (repo root)

### 2.2 Set Environment Variables
In Vercel → **Settings** → **Environment Variables**, add:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://clarity-ai-production.up.railway.app` (your Railway URL) |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `VITE_SITE_URL` | `https://claritymode.vercel.app` (your Vercel URL) |

### 2.3 Deploy
- Vercel will auto-detect Vite and run `npm run build`
- The `vercel.json` rewrites SPA routes to `index.html` while preserving `/api/` calls
- Visit `https://claritymode.vercel.app` to see the live app

### 2.4 Verify
- Open the site → should load without errors
- Check the AI Coach page → the error should be **gone**
- Open DevTools → Network tab → POST `/api/chat/` should go directly to Railway

---

## 🗄️ Step 3 — Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com/)
2. Go to **SQL Editor** → paste the contents of `supabase-schema.sql` → **Run**
3. Go to **Authentication** → **Settings**:
   - Site URL: `https://claritymode.vercel.app`
   - Redirect URLs: `https://claritymode.vercel.app/**`
4. Go to **Settings** → **API**:
   - Copy **Project URL** → use as `VITE_SUPABASE_URL` (frontend) and `SUPABASE_URL` (backend)
   - Copy **anon public** key → use as `VITE_SUPABASE_ANON_KEY` (frontend)
   - Copy **anon public** key → use as `SUPABASE_ANON_KEY` (backend)
   - Copy **service_role** key → use as `SUPABASE_SERVICE_ROLE_KEY` (backend only)

5. Create your admin user:
   - **Authentication** → **Users** → **Add user** → email: `admin@claritymode.com`
   - Then **SQL Editor** → run:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'admin@claritymode.com';
   ```

---

## 🔑 Step 4 — Configure AI Provider Keys

Get at least one of these:

| Provider | Free Tier | URL |
|---|---|---|
| **Gemini (recommended)** | Yes (Flash) | https://aistudio.google.com/app/apikey |
| **DeepSeek** | ~$0.14/M tokens | https://platform.deepseek.com/api_keys |
| OpenAI | Pay-as-you-go | https://platform.openai.com/api-keys |
| Claude | Pay-as-you-go | https://console.anthropic.com/ |

Add the keys to Railway backend variables.

---

## 🧪 Step 5 — Test End-to-End

```bash
# 1. Health check
curl https://clarity-ai-production.up.railway.app/api/health

# 2. Test chat
curl -X POST https://clarity-ai-production.up.railway.app/api/chat/ \
  -H "Content-Type: application/json" \
  -d '{"query":"Hello","n_results":3,"include_philosophy":false}'

# 3. Open browser
open https://claritymode.vercel.app
# Go to AI Coach → send a message → should get a real AI response
```

---

## 🛠️ Local Development

```bash
# Terminal 1: Backend
cd clarity-ai/backend
pip install -r requirements.txt
set PYTHONPATH=%CD%
python -m uvicorn main:app --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd (repo root)
npm install
npm run dev
# Open http://localhost:8080
```

The Vite dev server proxies `/api` to `http://localhost:8000` automatically.

---

## 🐛 Troubleshooting

### AI Coach says "Unable to connect to AI backend"
- ✅ Check that `VITE_API_URL` is set in Vercel to your Railway URL (no trailing slash)
- ✅ Check that Railway backend `/api/health` returns 200
- ✅ Check CORS: `ALLOWED_ORIGINS` in Railway must include your Vercel URL

### ChromaDB errors on startup
- ✅ Ensure Railway has a **Volume** mounted at `/data`
- ✅ Set `CHROMA_PERSIST_DIR=/data/chroma_db` and `UPLOADS_DIR=/data/uploads`

### "No AI providers configured"
- ✅ At least one of `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, etc. must be set
- ✅ Keys must be valid — test directly with the provider's API

### Auth errors
- ✅ Verify Supabase Site URL matches your deployed frontend
- ✅ Verify Redirect URLs include `https://yourdomain.com/**`
- ✅ Check the Supabase logs for failed login attempts

---

## 📊 Monitoring

- **Railway Metrics**: CPU, memory, request count, error rate
- **Health endpoint**: `GET /api/health` — returns provider status, ChromaDB, embeddings
- **Logs**: `clarity-ai` logger writes to stdout (Railway captures)
- **Vercel Analytics**: Built-in Web Vitals + function logs

---

## 💰 Cost Estimate (free tier)

| Service | Free Tier | Notes |
|---|---|---|
| Vercel | 100 GB bandwidth/mo | Frontend hosting |
| Railway | $5 credit/mo | Enough for ~1 backend instance |
| Supabase | 500 MB DB, 50k auth users | Auth + storage |
| Gemini Flash | 15 RPM, 1M tokens/day | AI chat |
| DeepSeek | ~$0.14/M tokens | Cheap fallback |

**Total estimated cost: $0–5/month** for low-traffic production.