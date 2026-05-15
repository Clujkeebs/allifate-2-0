-- Migration 006: Billing safety, usage-tracking RLS, and missing indexes.
-- Safe to apply on top of an existing database — every statement is idempotent.

-- =============================================
-- SUBSCRIPTIONS: allow users to read+update usage on their own row.
-- The existing policy only had USING for SELECT (via implicit pattern),
-- which left UPDATE blocked for the authenticated user. We allow UPDATE
-- only on the usage counter — the Stripe webhook (service role) owns
-- tier / status / limit / period_end.
-- =============================================

-- Drop and recreate the SELECT policy as an explicit FOR SELECT
DROP POLICY IF EXISTS "Users view own subscription" ON public.subscriptions;
CREATE POLICY "Users view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Allow the user (or the API route running with their JWT) to increment
-- posts_used_this_month. The CHECK keeps them from rewriting tier/limit/status.
DROP POLICY IF EXISTS "Users update own usage" ON public.subscriptions;
CREATE POLICY "Users update own usage"
  ON public.subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Helpful index on the Stripe subscription id (webhook lookups)
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub
  ON public.subscriptions(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer
  ON public.subscriptions(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- =============================================
-- POST ANALYTICS: index for time-series chart queries
-- =============================================
CREATE INDEX IF NOT EXISTS idx_post_analytics_piece
  ON public.post_analytics(content_piece_id, fetched_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_analytics_platform_time
  ON public.post_analytics(platform, fetched_at DESC);

-- =============================================
-- USAGE LOGS: ensure insert policy exists (writers run as the user)
-- =============================================
DROP POLICY IF EXISTS "Users insert own logs" ON public.usage_logs;
CREATE POLICY "Users insert own logs"
  ON public.usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- Atomic helper to increment a user's monthly usage from API routes
-- without race conditions. Returns the new usage count.
-- =============================================
CREATE OR REPLACE FUNCTION public.increment_posts_used(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  IF auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Forbidden: caller does not match target user';
  END IF;

  UPDATE public.subscriptions
    SET posts_used_this_month = posts_used_this_month + 1
    WHERE user_id = p_user_id
    RETURNING posts_used_this_month INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_posts_used(UUID) TO authenticated;
