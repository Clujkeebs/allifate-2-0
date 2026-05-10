-- Migration 005: Faceless Reels Enhancements
-- Adds voice_id and niche to content_jobs
-- Adds script_segments to content_pieces for granular control

ALTER TABLE public.content_jobs
ADD COLUMN IF NOT EXISTS voice_id TEXT,
ADD COLUMN IF NOT EXISTS niche TEXT;

ALTER TABLE public.content_pieces
ADD COLUMN IF NOT EXISTS script_segments JSONB DEFAULT '[]';

COMMENT ON COLUMN public.content_jobs.voice_id IS 'ID of the ElevenLabs voice used for narration';
COMMENT ON COLUMN public.content_jobs.niche IS 'Faceless niche selected (reddit, motivation, etc.)';
COMMENT ON COLUMN public.content_pieces.script_segments IS 'Segmented script with per-scene visuals and timestamps';
