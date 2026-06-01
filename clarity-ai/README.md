# Clarity AI - Diary Intelligence Platform

An AI-powered personal diary analysis system that runs 100% locally. Upload handwritten diary entries via OCR, analyze emotional patterns, and chat with your entries using RAG (Retrieval-Augmented Generation).

## Architecture

```
clarity-ai/
├── backend/           # FastAPI Python backend
│   ├── main.py              # App entry point, CORS, router registration
│   ├── database/            # ChromaDB vector database client
│   ├── models/              # Pydantic schemas
│   ├── pipelines/           # OCR pipeline (PaddleOCR)
│   ├── routers/             # API routes: upload, chat, dashboard
│   └── utils/               # Embeddings, text chunker, Ollama client
├── frontend/          # React + Vite + Tailwind frontend
│   ├── src/
│   │   ├── api.ts           # API client for all endpoints
│   │   ├── App.tsx          # Router + layout
│   │   └── pages/           # UploadPage, DashboardPage, ChatPage
│   └── dist/                # Built static files (served by backend in prod)
└── uploads/           # Uploaded diary files
```

## Quick Start

### 1. Backend Setup

```bash
cd clarity-ai/backend
python -m venv venv
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
```

Copy environment config:
```bash
cp ../.env.example .env
```

Start the backend:
```bash
python main.py
# API available at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

### 2. Frontend Setup (Development)

```bash
cd clarity-ai/frontend
npm install
npm run dev
# Running at http://localhost:5173 (proxies /api to backend)
```

### 3. Production Build

The backend serves the built frontend automatically:
```bash
cd clarity-ai/frontend
npm run build
```

Then just run the backend — it will detect and serve `frontend/dist/`.

## API Endpoints

| Method | Path                  | Description                        |
|--------|-----------------------|------------------------------------|
| GET    | `/api/health`         | Health check                       |
| POST   | `/api/upload-diary`   | Quick file upload (save only)      |
| POST   | `/api/upload/`        | Full pipeline: OCR → chunk → store |
| POST   | `/api/chat/`          | RAG chat with diary context        |
| GET    | `/api/dashboard/`     | Dashboard stats & top emotions     |
| GET    | `/api/dashboard/patterns` | Pattern detection              |
| GET    | `/api/dashboard/timeline`  | Growth timeline analysis      |

## Tech Stack

- **Backend**: FastAPI, ChromaDB, PaddleOCR, Sentence Transformers, Ollama
- **Frontend**: React 18, Vite, Tailwind CSS, React Router v6
- **AI**: Local LLM via Ollama (Qwen 2.5 7B), all-MiniLM-L6-v2 embeddings