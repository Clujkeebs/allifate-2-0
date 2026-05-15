-- Migration 008: Post scheduler + pg_cron setup
--
-- Creates a processing status value, adds a unique index to prevent
-- double-publishing, and schedules the post-scheduler edge function
-- to run every minute via pg_cron (requires pg_cron extension).

-- Add 'processing' as a valid intermediate status so the scheduler
-- can optimistically lock a row before publishing it.
DO $$
BEGIN
  -- Alter the status check constraint to include 'processing'
  ALTER TABLE public.scheduled_posts
    DROP CONSTRAINT IF EXISTS scheduled_posts_status_check;

  ALTER TABLE public.scheduled_posts
    ADD CONSTRAINT scheduled_posts_status_check
    CHECK (status IN ('scheduled', 'processing', 'posted', 'failed', 'cancelled'));
END$$;

-- Unique partial index: at most one 'scheduled' or 'processing' row per
-- content_piece per platform.  Prevents accidental duplicate scheduling.
CREATE UNIQUE INDEX IF NOT EXISTS idx_scheduled_posts_no_duplicate_pending
  ON public.scheduled_posts(content_piece_id, platform)
  WHERE status IN ('scheduled', 'processing');

-- Index on (status, scheduled_for) for the scheduler's polling query.
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_due
  ON public.scheduled_posts(status, scheduled_for)
  WHERE status = 'scheduled';

-- ── pg_cron ──────────────────────────────────────────────────────
-- Run the post-scheduler edge function every minute.
-- pg_cron must be enabled on your Supabase project (Database → Extensions).
-- The edge function URL and secret come from Supabase project settings.
--
-- Replace <PROJECT_REF> with your Supabase project reference slug.
-- Replace <SCHEDULER_SECRET> with the value you set in the edge function's env.

-- Uncomment and fill in the values when deploying:
-- SELECT cron.schedule(
--   'post-scheduler',                         -- job name (unique)
--   '* * * * *',                              -- every minute
--   $$
--     SELECT
--       net.http_post(
--         url := 'https://<PROJECT_REF>.functions.supabase.co/post-scheduler',
--         headers := '{"Content-Type": "application/json", "x-scheduler-secret": "<SCHEDULER_SECRET>"}'::jsonb,
--         body := '{}'::jsonb
--       )
--   $$
-- );
