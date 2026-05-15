-- Migration 007: rename the integration columns from "zerio_*" to "zernio_*"
-- to match the corrected brand name.
--
-- Idempotent: each rename is guarded so re-running on an already-renamed DB
-- is a no-op. Provider enum values inside platform_connections.provider are
-- updated in place.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'platform_connections'
      AND column_name = 'zerio_connection_id'
  ) THEN
    ALTER TABLE public.platform_connections
      RENAME COLUMN zerio_connection_id TO zernio_connection_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'scheduled_posts'
      AND column_name = 'zerio_post_id'
  ) THEN
    ALTER TABLE public.scheduled_posts
      RENAME COLUMN zerio_post_id TO zernio_post_id;
  END IF;
END$$;

-- Update any existing rows that recorded the old provider name
UPDATE public.platform_connections SET provider = 'zernio' WHERE provider = 'zerio';

-- Refresh column comments so future readers see the right brand
COMMENT ON COLUMN public.platform_connections.zernio_connection_id IS
  'Zernio connection ID for this platform connection. NULL for direct OAuth connections.';
COMMENT ON COLUMN public.platform_connections.provider IS
  'Connection provider: "zernio" or "direct" (per-platform OAuth)';
COMMENT ON COLUMN public.scheduled_posts.zernio_post_id IS
  'Zernio post ID for correlating webhook events';

-- Recreate the indexes that pointed at the old column names
DROP INDEX IF EXISTS public.idx_platform_connections_zerio_id;
DROP INDEX IF EXISTS public.idx_scheduled_posts_zerio_post_id;

CREATE INDEX IF NOT EXISTS idx_platform_connections_zernio_id
  ON public.platform_connections(zernio_connection_id)
  WHERE zernio_connection_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_zernio_post_id
  ON public.scheduled_posts(zernio_post_id)
  WHERE zernio_post_id IS NOT NULL;
