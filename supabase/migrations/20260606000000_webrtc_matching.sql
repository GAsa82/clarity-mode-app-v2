-- =============================================================================
-- WebRTC 1-on-1 Matching System for Clarity Mode Focus Rooms
-- Tables: match_queue, rooms, room_participants, sessions, user_stats, user_reports
-- =============================================================================

-- ─── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Helper: auto-update updated_at ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── match_queue ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_queue (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  focus_room_slug   text        NOT NULL,
  match_type        text        NOT NULL CHECK (match_type IN ('study','networking','accountability','random')),
  gender_preference text        NOT NULL DEFAULT 'any' CHECK (gender_preference IN ('any','male','female')),
  interest_tags     text[]      NOT NULL DEFAULT '{}',
  plan_tier         text        NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free','premium','vip')),
  status            text        NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','matched','cancelled','expired')),
  matched_room_id   uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz NOT NULL DEFAULT now() + INTERVAL '10 minutes'
);

CREATE INDEX IF NOT EXISTS idx_match_queue_status     ON match_queue(status);
CREATE INDEX IF NOT EXISTS idx_match_queue_room_type  ON match_queue(focus_room_slug, match_type, status);
CREATE INDEX IF NOT EXISTS idx_match_queue_user       ON match_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_match_queue_expires    ON match_queue(expires_at) WHERE status = 'waiting';

CREATE TRIGGER trg_match_queue_updated_at
  BEFORE UPDATE ON match_queue
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─── rooms (private 1-on-1 rooms) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooms (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text        UNIQUE NOT NULL DEFAULT 'room-' || encode(gen_random_bytes(8), 'hex'),
  focus_room_slug text        NOT NULL,
  match_type      text        NOT NULL,
  status          text        NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','active','ended')),
  created_by      uuid        NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  started_at      timestamptz,
  ended_at        timestamptz,
  expires_at      timestamptz NOT NULL DEFAULT now() + INTERVAL '2 hours'
);

CREATE INDEX IF NOT EXISTS idx_rooms_status      ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_focus_room  ON rooms(focus_room_slug, status);
CREATE INDEX IF NOT EXISTS idx_rooms_slug        ON rooms(slug);

CREATE TRIGGER trg_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─── room_participants ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS room_participants (
  id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id   uuid        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at   timestamptz,
  is_active boolean     NOT NULL DEFAULT true,
  UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_room_participants_room   ON room_participants(room_id, is_active);
CREATE INDEX IF NOT EXISTS idx_room_participants_user   ON room_participants(user_id, is_active);

-- Auto-end room when both participants leave
CREATE OR REPLACE FUNCTION fn_check_room_empty()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM room_participants
    WHERE room_id = NEW.room_id AND is_active = true
  ) THEN
    UPDATE rooms SET status = 'ended', ended_at = NOW() WHERE id = NEW.room_id AND status != 'ended';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_end_empty_room
  AFTER UPDATE OF is_active ON room_participants
  FOR EACH ROW WHEN (NEW.is_active = false)
  EXECUTE FUNCTION fn_check_room_empty();

-- Auto-activate room when second participant joins
CREATE OR REPLACE FUNCTION fn_check_room_ready()
RETURNS TRIGGER AS $$
DECLARE
  participant_count integer;
BEGIN
  SELECT COUNT(*) INTO participant_count
  FROM room_participants
  WHERE room_id = NEW.room_id AND is_active = true;

  IF participant_count >= 2 THEN
    UPDATE rooms
    SET status = 'active', started_at = COALESCE(started_at, NOW())
    WHERE id = NEW.room_id AND status = 'waiting';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_activate_room
  AFTER INSERT ON room_participants
  FOR EACH ROW EXECUTE FUNCTION fn_check_room_ready();

-- ─── sessions ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id          uuid        REFERENCES rooms(id),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id       uuid        REFERENCES auth.users(id),
  match_type       text,
  focus_room_slug  text,
  duration_minutes integer,
  pomodoro_count   integer     NOT NULL DEFAULT 0,
  started_at       timestamptz NOT NULL DEFAULT now(),
  ended_at         timestamptz,
  completed        boolean     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_sessions_user   ON sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_room   ON sessions(room_id);

-- ─── user_stats ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_stats (
  user_id         uuid    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_matches   integer NOT NULL DEFAULT 0,
  total_sessions  integer NOT NULL DEFAULT 0,
  total_minutes   integer NOT NULL DEFAULT 0,
  daily_matches   integer NOT NULL DEFAULT 0,
  last_match_date date,
  reputation_score integer NOT NULL DEFAULT 100,
  blocked_users   uuid[]  NOT NULL DEFAULT '{}',
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_user_stats_updated_at
  BEFORE UPDATE ON user_stats
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Reset daily_matches each new day
CREATE OR REPLACE FUNCTION fn_reset_daily_matches()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_match_date IS DISTINCT FROM CURRENT_DATE THEN
    NEW.daily_matches := 0;
    NEW.last_match_date := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reset_daily_matches
  BEFORE INSERT OR UPDATE ON user_stats
  FOR EACH ROW EXECUTE FUNCTION fn_reset_daily_matches();

-- Auto-create user_stats row on first queue insert
CREATE OR REPLACE FUNCTION fn_ensure_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats(user_id) VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ensure_user_stats
  AFTER INSERT ON match_queue
  FOR EACH ROW EXECUTE FUNCTION fn_ensure_user_stats();

-- ─── user_reports ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_reports (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid        NOT NULL REFERENCES auth.users(id),
  reported_id uuid        NOT NULL REFERENCES auth.users(id),
  room_id     uuid        REFERENCES rooms(id),
  reason      text        NOT NULL CHECK (reason IN ('spam','harassment','inappropriate','other')),
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(reporter_id, reported_id, room_id)
);

-- ─── Increment match count RPC ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_match_count(p_user_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO user_stats(user_id, total_matches, daily_matches, last_match_date)
  VALUES (p_user_id, 1, 1, CURRENT_DATE)
  ON CONFLICT (user_id) DO UPDATE
  SET total_matches = user_stats.total_matches + 1,
      daily_matches = CASE
        WHEN user_stats.last_match_date = CURRENT_DATE THEN user_stats.daily_matches + 1
        ELSE 1
      END,
      last_match_date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE match_queue      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms             ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports      ENABLE ROW LEVEL SECURITY;

-- match_queue
CREATE POLICY "queue_select" ON match_queue FOR SELECT USING (
  auth.uid() = user_id OR status = 'waiting'
);
CREATE POLICY "queue_insert" ON match_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "queue_update" ON match_queue FOR UPDATE USING (
  auth.uid() = user_id
  OR auth.uid() IN (
    SELECT user_id FROM match_queue mq2
    WHERE mq2.matched_room_id IS NOT NULL
    AND mq2.matched_room_id = match_queue.matched_room_id
  )
);
CREATE POLICY "queue_delete" ON match_queue FOR DELETE USING (auth.uid() = user_id);

-- rooms
CREATE POLICY "rooms_select" ON rooms FOR SELECT USING (
  auth.uid() = created_by
  OR status = 'waiting'
  OR EXISTS (SELECT 1 FROM room_participants WHERE room_id = rooms.id AND user_id = auth.uid())
);
CREATE POLICY "rooms_insert" ON rooms FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "rooms_update" ON rooms FOR UPDATE USING (
  auth.uid() = created_by
  OR EXISTS (SELECT 1 FROM room_participants WHERE room_id = rooms.id AND user_id = auth.uid())
);

-- room_participants
CREATE POLICY "rp_select" ON room_participants FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM room_participants rp2 WHERE rp2.room_id = room_participants.room_id AND rp2.user_id = auth.uid())
);
CREATE POLICY "rp_insert" ON room_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rp_update" ON room_participants FOR UPDATE USING (auth.uid() = user_id);

-- sessions
CREATE POLICY "sessions_select" ON sessions FOR SELECT USING (auth.uid() = user_id OR auth.uid() = partner_id);
CREATE POLICY "sessions_insert" ON sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_update" ON sessions FOR UPDATE USING (auth.uid() = user_id);

-- user_stats
CREATE POLICY "stats_select" ON user_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "stats_insert" ON user_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "stats_update" ON user_stats FOR UPDATE USING (auth.uid() = user_id);

-- user_reports
CREATE POLICY "reports_insert" ON user_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_select" ON user_reports FOR SELECT USING (auth.uid() = reporter_id);

-- Grant RPC to authenticated users
GRANT EXECUTE ON FUNCTION increment_match_count(uuid) TO authenticated;
