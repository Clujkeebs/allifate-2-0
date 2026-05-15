export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Platform = 'tiktok' | 'instagram' | 'youtube' | 'twitter' | 'linkedin' | 'facebook' | 'pinterest' | 'snapchat'
export type SubscriptionTier = 'starter' | 'pro' | 'agency'
export type JobStatus = 'pending' | 'processing' | 'review' | 'scheduled' | 'posted' | 'failed'
export type AssetType = 'video' | 'image' | 'audio'
export type PostStatus = 'scheduled' | 'posted' | 'failed' | 'cancelled'
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  niche: string | null
  tone_preference: string | null
  subscription_tier: SubscriptionTier
  credits_remaining: number
  created_at: string
  brand_colors: string[] | null
  brand_logo_url: string | null
  api_key: string | null
}

export interface PlatformConnection {
  id: string
  user_id: string
  platform: Platform
  access_token: string
  refresh_token: string | null
  account_id: string
  account_name: string
  account_avatar: string | null
  expires_at: string | null
  is_active: boolean
  created_at: string
  zernio_connection_id: string | null
  provider: 'zernio' | 'direct'
}

export interface ContentJob {
  id: string
  user_id: string
  prompt: string
  status: JobStatus
  platforms: Platform[]
  pipeline_stage: string | null
  pipeline_progress: number
  created_at: string
  completed_at: string | null
  error_message: string | null
  source_mode: 'upload' | 'stock' | 'screen'
  tone: string | null
  music_mood: string | null
  video_length: number | null
  caption_style: string | null
  image_style: string | null
  image_aspect_ratio: string | null
  voice_id: string | null
  niche: string | null
}

export interface ContentPiece {
  id: string
  job_id: string
  user_id: string
  platform: Platform
  video_url: string | null
  thumbnail_url: string | null
  caption: string | null
  hashtags: string[]
  music_track: string | null
  duration_seconds: number | null
  status: 'draft' | 'approved' | 'posted'
  engagement_score: number | null
  posted_at: string | null
  script: string | null
  hook: string | null
  script_segments: Json
}

export interface UserAsset {
  id: string
  user_id: string
  file_url: string
  file_type: AssetType
  name: string
  tags: string[]
  size_bytes: number
  created_at: string
  thumbnail_url: string | null
}

export interface ScheduledPost {
  id: string
  content_piece_id: string
  user_id: string
  platform: Platform
  scheduled_for: string
  posted_at: string | null
  status: PostStatus
  platform_post_id: string | null
  error_message: string | null
  zernio_post_id: string | null
}

export interface UsageLog {
  id: string
  user_id: string
  action: string
  credits_used: number
  metadata: Json | null
  created_at: string
}

export interface PostAnalytics {
  id: string
  content_piece_id: string
  platform: Platform
  views: number
  likes: number
  shares: number
  comments: number
  saves: number
  watch_time_avg: number | null
  click_rate: number | null
  fetched_at: string
}

export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  tier: SubscriptionTier
  status: SubscriptionStatus
  current_period_end: string | null
  posts_used_this_month: number
  posts_limit: number
}

// Supabase database type definition
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          niche?: string | null
          tone_preference?: string | null
          subscription_tier?: SubscriptionTier
          credits_remaining?: number
          brand_colors?: string[] | null
          brand_logo_url?: string | null
          api_key?: string | null
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          niche?: string | null
          tone_preference?: string | null
          subscription_tier?: SubscriptionTier
          credits_remaining?: number
          brand_colors?: string[] | null
          brand_logo_url?: string | null
          api_key?: string | null
        }
      }
      platform_connections: {
        Row: PlatformConnection
        Insert: {
          id?: string
          user_id: string
          platform: Platform
          access_token: string
          refresh_token?: string | null
          account_id: string
          account_name: string
          account_avatar?: string | null
          expires_at?: string | null
          is_active?: boolean
          zernio_connection_id?: string | null
          provider?: 'zernio' | 'direct'
        }
        Update: {
          is_active?: boolean
          access_token?: string
          refresh_token?: string | null
          expires_at?: string | null
          account_name?: string
          account_avatar?: string | null
          zernio_connection_id?: string | null
          provider?: 'zernio' | 'direct'
        }
      }
      content_jobs: {
        Row: ContentJob
        Insert: {
          id?: string
          user_id: string
          prompt: string
          status?: JobStatus
          platforms?: Platform[]
          pipeline_stage?: string | null
          pipeline_progress?: number
          source_mode?: 'upload' | 'stock' | 'screen'
          tone?: string | null
          music_mood?: string | null
          video_length?: number | null
          caption_style?: string | null
          error_message?: string | null
          completed_at?: string | null
          image_style?: string | null
          image_aspect_ratio?: string | null
          voice_id?: string | null
          niche?: string | null
        }
        Update: {
          status?: JobStatus
          pipeline_stage?: string | null
          pipeline_progress?: number
          error_message?: string | null
          completed_at?: string | null
          image_style?: string | null
          image_aspect_ratio?: string | null
          voice_id?: string | null
          niche?: string | null
        }
      }
      content_pieces: {
        Row: ContentPiece
        Insert: {
          id?: string
          job_id: string
          user_id: string
          platform: Platform
          video_url?: string | null
          thumbnail_url?: string | null
          caption?: string | null
          hashtags?: string[]
          hook?: string | null
          script?: string | null
          music_track?: string | null
          duration_seconds?: number | null
          status?: 'draft' | 'approved' | 'posted'
          engagement_score?: number | null
          posted_at?: string | null
          script_segments?: Json
        }
        Update: {
          video_url?: string | null
          thumbnail_url?: string | null
          caption?: string | null
          hashtags?: string[]
          status?: 'draft' | 'approved' | 'posted'
          engagement_score?: number | null
          posted_at?: string | null
          script_segments?: Json
        }
      }
      user_assets: {
        Row: UserAsset
        Insert: {
          id?: string
          user_id: string
          file_url: string
          file_type: AssetType
          name: string
          tags?: string[]
          size_bytes?: number
          thumbnail_url?: string | null
        }
        Update: {
          name?: string
          tags?: string[]
          thumbnail_url?: string | null
        }
      }
      scheduled_posts: {
        Row: ScheduledPost
        Insert: {
          id?: string
          content_piece_id: string
          user_id: string
          platform: Platform
          scheduled_for: string
          posted_at?: string | null
          status?: PostStatus
          platform_post_id?: string | null
          error_message?: string | null
          zernio_post_id?: string | null
        }
        Update: {
          scheduled_for?: string
          status?: PostStatus
          posted_at?: string | null
          platform_post_id?: string | null
          error_message?: string | null
          zernio_post_id?: string | null
        }
      }
      usage_logs: {
        Row: UsageLog
        Insert: {
          id?: string
          user_id: string
          action: string
          credits_used?: number
          metadata?: Json | null
        }
        Update: {
          action?: string
          credits_used?: number
          metadata?: Json | null
        }
      }
      post_analytics: {
        Row: PostAnalytics
        Insert: {
          id?: string
          content_piece_id: string
          platform: Platform
          views?: number
          likes?: number
          shares?: number
          comments?: number
          saves?: number
          watch_time_avg?: number | null
          click_rate?: number | null
        }
        Update: {
          views?: number
          likes?: number
          shares?: number
          comments?: number
          saves?: number
          watch_time_avg?: number | null
          click_rate?: number | null
          fetched_at?: string
        }
      }
      subscriptions: {
        Row: Subscription
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: SubscriptionTier
          status?: SubscriptionStatus
          current_period_end?: string | null
          posts_used_this_month?: number
          posts_limit?: number
        }
        Update: {
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: SubscriptionTier
          status?: SubscriptionStatus
          current_period_end?: string | null
          posts_used_this_month?: number
          posts_limit?: number
        }
      }
    }
  }
}
