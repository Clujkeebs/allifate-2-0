-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILES (extends auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  niche TEXT,
  tone_preference TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'pro', 'agency')),
  credits_remaining INTEGER NOT NULL DEFAULT 40,
  brand_colors TEXT[] DEFAULT '{}',
  brand_logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );

  INSERT INTO public.subscriptions (user_id, tier, status, posts_limit)
  VALUES (new.id, 'starter', 'trialing', 20);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =============================================
-- PLATFORM CONNECTIONS
-- =============================================
CREATE TABLE IF NOT EXISTS public.platform_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'youtube', 'twitter', 'linkedin', 'facebook', 'pinterest', 'snapchat')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  account_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_avatar TEXT,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform)
);

ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own connections" ON public.platform_connections USING (auth.uid() = user_id);

-- =============================================
-- CONTENT JOBS
-- =============================================
CREATE TABLE IF NOT EXISTS public.content_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'review', 'scheduled', 'posted', 'failed')),
  platforms TEXT[] NOT NULL DEFAULT '{}',
  pipeline_stage TEXT,
  pipeline_progress INTEGER DEFAULT 0,
  source_mode TEXT NOT NULL DEFAULT 'stock' CHECK (source_mode IN ('upload', 'stock', 'screen')),
  tone TEXT,
  music_mood TEXT,
  video_length INTEGER DEFAULT 60,
  caption_style TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

ALTER TABLE public.content_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own jobs" ON public.content_jobs USING (auth.uid() = user_id);
CREATE INDEX idx_content_jobs_user ON public.content_jobs(user_id, created_at DESC);
CREATE INDEX idx_content_jobs_status ON public.content_jobs(status) WHERE status IN ('pending', 'processing');

-- =============================================
-- CONTENT PIECES
-- =============================================
CREATE TABLE IF NOT EXISTS public.content_pieces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES public.content_jobs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'youtube', 'twitter', 'linkedin', 'facebook', 'pinterest', 'snapchat')),
  video_url TEXT,
  thumbnail_url TEXT,
  caption TEXT,
  hashtags TEXT[] DEFAULT '{}',
  hook TEXT,
  script TEXT,
  music_track TEXT,
  duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'posted')),
  engagement_score NUMERIC,
  posted_at TIMESTAMPTZ
);

ALTER TABLE public.content_pieces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own pieces" ON public.content_pieces USING (auth.uid() = user_id);
CREATE INDEX idx_content_pieces_job ON public.content_pieces(job_id);
CREATE INDEX idx_content_pieces_user ON public.content_pieces(user_id, posted_at DESC NULLS LAST);

-- =============================================
-- USER ASSETS
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('video', 'image', 'audio')),
  name TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  size_bytes BIGINT NOT NULL DEFAULT 0,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own assets" ON public.user_assets USING (auth.uid() = user_id);

-- =============================================
-- SCHEDULED POSTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.scheduled_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_piece_id UUID REFERENCES public.content_pieces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'youtube', 'twitter', 'linkedin', 'facebook', 'pinterest', 'snapchat')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  posted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'posted', 'failed', 'cancelled')),
  platform_post_id TEXT,
  error_message TEXT
);

ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own scheduled posts" ON public.scheduled_posts USING (auth.uid() = user_id);
CREATE INDEX idx_scheduled_posts_time ON public.scheduled_posts(scheduled_for) WHERE status = 'scheduled';

-- =============================================
-- POST ANALYTICS
-- =============================================
CREATE TABLE IF NOT EXISTS public.post_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_piece_id UUID REFERENCES public.content_pieces(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL,
  views BIGINT NOT NULL DEFAULT 0,
  likes BIGINT NOT NULL DEFAULT 0,
  shares BIGINT NOT NULL DEFAULT 0,
  comments BIGINT NOT NULL DEFAULT 0,
  saves BIGINT NOT NULL DEFAULT 0,
  watch_time_avg NUMERIC,
  click_rate NUMERIC,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.post_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own analytics" ON public.post_analytics
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM public.content_pieces WHERE id = content_piece_id)
  );

-- =============================================
-- SUBSCRIPTIONS
-- =============================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  tier TEXT NOT NULL DEFAULT 'starter' CHECK (tier IN ('starter', 'pro', 'agency')),
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  current_period_end TIMESTAMPTZ,
  posts_used_this_month INTEGER NOT NULL DEFAULT 0,
  posts_limit INTEGER NOT NULL DEFAULT 20
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own subscription" ON public.subscriptions USING (auth.uid() = user_id);

-- =============================================
-- USAGE LOGS
-- =============================================
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  credits_used INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own logs" ON public.usage_logs FOR SELECT USING (auth.uid() = user_id);

-- =============================================
-- STORAGE BUCKETS (run separately in Supabase Dashboard or via MCP)
-- =============================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('user-assets', 'user-assets', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('content-output', 'content-output', true);
--
-- CREATE POLICY "User asset upload" ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'user-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "User asset access" ON storage.objects FOR SELECT
--   USING (bucket_id = 'user-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
