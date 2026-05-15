-- Migration 003: Zernio Integration Fields
-- Adds zernio_connection_id to platform_connections for tracking
-- Adds zernio_post_id to scheduled_posts for Zernio webhook correlation

-- Enable pgcrypto if not already enabled (for generate_api_key)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add Zernio connection ID to platform_connections
ALTER TABLE public.platform_connections
ADD COLUMN IF NOT EXISTS zernio_connection_id TEXT,
ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'direct';

COMMENT ON COLUMN public.platform_connections.zernio_connection_id IS 'Zernio connection ID for this platform connection. NULL for direct OAuth connections.';
COMMENT ON COLUMN public.platform_connections.provider IS 'Connection provider: "zernio" or "direct" (per-platform OAuth)';

-- Add Zernio post ID to scheduled_posts (for webhook correlation)
ALTER TABLE public.scheduled_posts
ADD COLUMN IF NOT EXISTS zernio_post_id TEXT;

COMMENT ON COLUMN public.scheduled_posts.zernio_post_id IS 'Zernio post ID for correlating webhook events';

-- Create index for Zernio connection lookups
CREATE INDEX IF NOT EXISTS idx_platform_connections_zernio_id
ON public.platform_connections(zernio_connection_id)
WHERE zernio_connection_id IS NOT NULL;

-- Create index for Zernio post lookups
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_zernio_post_id
ON public.scheduled_posts(zernio_post_id)
WHERE zernio_post_id IS NOT NULL;
