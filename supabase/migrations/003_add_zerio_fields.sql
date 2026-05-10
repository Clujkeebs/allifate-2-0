-- Migration 003: Zerio Integration Fields
-- Adds zerio_connection_id to platform_connections for tracking
-- Adds zerio_post_id to scheduled_posts for Zerio webhook correlation

-- Enable pgcrypto if not already enabled (for generate_api_key)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add Zerio connection ID to platform_connections
ALTER TABLE public.platform_connections
ADD COLUMN IF NOT EXISTS zerio_connection_id TEXT,
ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'direct';

COMMENT ON COLUMN public.platform_connections.zerio_connection_id IS 'Zerio connection ID for this platform connection. NULL for direct OAuth connections.';
COMMENT ON COLUMN public.platform_connections.provider IS 'Connection provider: "zerio" or "direct" (per-platform OAuth)';

-- Add Zerio post ID to scheduled_posts (for webhook correlation)
ALTER TABLE public.scheduled_posts
ADD COLUMN IF NOT EXISTS zerio_post_id TEXT;

COMMENT ON COLUMN public.scheduled_posts.zerio_post_id IS 'Zerio post ID for correlating webhook events';

-- Create index for Zerio connection lookups
CREATE INDEX IF NOT EXISTS idx_platform_connections_zerio_id
ON public.platform_connections(zerio_connection_id)
WHERE zerio_connection_id IS NOT NULL;

-- Create index for Zerio post lookups
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_zerio_post_id
ON public.scheduled_posts(zerio_post_id)
WHERE zerio_post_id IS NOT NULL;
