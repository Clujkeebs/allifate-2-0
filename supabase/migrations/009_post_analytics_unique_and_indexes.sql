-- Migration 009: post_analytics unique constraint + additional performance indexes

-- Unique constraint so upsert(content_piece_id, platform) works correctly
-- (required by zernio-webhook and zapier-webhook upsert calls)
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_analytics_piece_platform
  ON public.post_analytics (content_piece_id, platform);

-- Index for scheduled_posts lookup by user + status (dashboard queries)
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_status
  ON public.scheduled_posts (user_id, status, scheduled_for DESC);

-- Index for content_pieces lookup by job + platform
CREATE INDEX IF NOT EXISTS idx_content_pieces_job_platform
  ON public.content_pieces (job_id, platform);

-- Index for usage_logs by user + created_at (analytics queries)
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_created
  ON public.usage_logs (user_id, created_at DESC);
