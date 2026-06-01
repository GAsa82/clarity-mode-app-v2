-- ═══════════════════════════════════════════════════════════════════════════════
-- Clarity Mode — Supabase SQL Schema
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Profiles ──────────────────────────────────────────────────────────────
-- Extends the built-in auth.users table with app-specific profile data.
-- Automatically created on user signup via trigger.

CREATE TABLE public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    name        TEXT,
    avatar_url  TEXT,
    role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        CASE
            WHEN NEW.email LIKE ANY(ARRAY['admin@%', 'gaurav@%']) THEN 'admin'
            ELSE 'user'
        END
    );
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ─── 2. Diaries ───────────────────────────────────────────────────────────────
-- Tracks all diary entries uploaded by users.
-- Stores extracted text, file metadata, and AI-extracted entities.

CREATE TABLE public.diaries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_id         TEXT NOT NULL,
    filename        TEXT NOT NULL,
    file_size_bytes BIGINT DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
    error_message   TEXT,

    -- OCR / extracted text
    extracted_text  TEXT,
    text_length     INTEGER DEFAULT 0,

    -- Chunking
    chunks_count    INTEGER DEFAULT 0,
    chunk_ids       TEXT[] DEFAULT '{}',

    -- AI-extracted entities (stored as JSON for flexibility)
    entities        JSONB DEFAULT '{}',
    -- e.g. {"emotions": [], "themes": [], "beliefs": [], "goals": [], "fears": [], "desires": []}

    -- Language detection
    language        TEXT DEFAULT 'unknown',

    -- Metadata from text analysis
    word_count      INTEGER DEFAULT 0,
    sentiment_score FLOAT DEFAULT 0,

    -- Timestamps
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at    TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_diaries_user_id ON public.diaries(user_id);
CREATE INDEX idx_diaries_status ON public.diaries(status);
CREATE INDEX idx_diaries_uploaded_at ON public.diaries(uploaded_at DESC);
CREATE INDEX idx_diaries_user_date ON public.diaries(user_id, uploaded_at DESC);

-- ─── 3. Upload History ────────────────────────────────────────────────────────
-- Tracks every file upload event with status changes.

CREATE TABLE public.upload_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    diary_id        UUID REFERENCES public.diaries(id) ON DELETE SET NULL,

    -- File info
    filename        TEXT NOT NULL,
    file_size_bytes BIGINT DEFAULT 0,
    file_type       TEXT, -- extension

    -- Status tracking
    status          TEXT NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading', 'processing', 'completed', 'failed')),
    status_message  TEXT,

    -- Processing details
    chunks_created  INTEGER DEFAULT 0,
    ocr_success     BOOLEAN DEFAULT FALSE,
    embedding_success BOOLEAN DEFAULT FALSE,

    -- Timestamps
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_upload_history_user ON public.upload_history(user_id);
CREATE INDEX idx_upload_history_status ON public.upload_history(status);
CREATE INDEX idx_upload_history_diary ON public.upload_history(diary_id);

-- ─── 4. Row Level Security ────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_history ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile; admins can read all
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (id = auth.uid());

-- Diaries: users can CRUD their own diaries; admins can read all
CREATE POLICY "Users can read own diaries"
    ON public.diaries FOR SELECT
    USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can insert own diaries"
    ON public.diaries FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own diaries"
    ON public.diaries FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own diaries"
    ON public.diaries FOR DELETE
    USING (user_id = auth.uid());

-- Upload history: users can CRUD their own; admins can read all
CREATE POLICY "Users can read own upload history"
    ON public.upload_history FOR SELECT
    USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can insert own upload history"
    ON public.upload_history FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own upload history"
    ON public.upload_history FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());


-- ─── 5. Helper Functions ──────────────────────────────────────────────────────

-- Get total diary count for a user
CREATE OR REPLACE FUNCTION public.get_user_diary_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
    SELECT COUNT(*)::INTEGER FROM public.diaries WHERE user_id = p_user_id;
$$;

-- Get total upload count for a user
CREATE OR REPLACE FUNCTION public.get_user_upload_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
    SELECT COUNT(*)::INTEGER FROM public.upload_history WHERE user_id = p_user_id;
$$;

-- Update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_diaries_updated_at
    BEFORE UPDATE ON public.diaries
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_upload_history_updated_at
    BEFORE UPDATE ON public.upload_history
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();