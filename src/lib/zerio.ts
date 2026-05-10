/**
 * Zerio Integration — Social Media API Aggregator
 *
 * Zerio handles multi-platform OAuth, posting, and analytics through a single API.
 * This module abstracts all Zerio interactions and tracks referral/revenue share.
 *
 * When Zerio is not configured (no ZERIO_API_KEY in env), the module gracefully
 * returns null/disabled — the UI falls back to per-platform OAuth.
 *
 * To enable: set VITE_ZERIO_API_KEY + ZERIO_API_SECRET in your .env
 * Referral: set ZERIO_REFERRAL_CODE to track revenue share
 */

import type { Platform } from '@/types/database'

// ── Types ──────────────────────────────────────────────────────

export interface ZerioConnection {
  /** Zerio's internal connection ID */
  id: string
  /** Platform identifier */
  platform: Platform
  /** OAuth access token */
  access_token: string
  /** OAuth refresh token (may be null) */
  refresh_token: string | null
  /** Platform account ID (e.g., TikTok open_id, Instagram user ID) */
  account_id: string
  /** Human-readable account name (e.g., @username) */
  account_name: string
  /** Account avatar URL */
  account_avatar: string | null
  /** Token expiration ISO timestamp */
  expires_at: string | null
  /** Whether the connection is active */
  is_active: boolean
}

export interface ZerioPostContent {
  /** Text caption / description */
  caption: string
  /** Video/image URL to post */
  media_url?: string
  /** Hashtags (array of strings without # prefix) */
  hashtags?: string[]
  /** Scheduled time (ISO string, omit for immediate posting) */
  scheduled_for?: string
  /** Thumbnail URL (for video platforms) */
  thumbnail_url?: string
}

export interface ZerioPostResult {
  /** Zerio post ID */
  id: string
  /** Platform-specific post ID/URL */
  platform_post_id: string
  /** Public URL to the post */
  post_url: string
  /** Post status */
  status: 'posted' | 'scheduled' | 'failed'
  /** Error message if failed */
  error?: string
}

export interface ZerioAnalytics {
  post_id: string
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

export interface ZerioAuthUrlResponse {
  /** URL to redirect the user to for OAuth authorization */
  url: string
  /** Session ID to track this auth attempt */
  session_id: string
}

// ── Configuration ──────────────────────────────────────────────

const ZERIO_BASE_URL = import.meta.env.VITE_ZERIO_BASE_URL || 'https://api.zerio.io/v1'
const ZERIO_API_KEY = import.meta.env.VITE_ZERIO_API_KEY || ''
const ZERIO_REFERRAL_CODE = import.meta.env.VITE_ZERIO_REFERRAL_CODE || ''

/** Whether Zerio is configured and available */
export function isZerioConfigured(): boolean {
  return Boolean(ZERIO_API_KEY)
}

/** Get the Zerio referral code (for revenue share tracking) */
export function getReferralCode(): string {
  return ZERIO_REFERRAL_CODE
}

// ── Internal helpers ───────────────────────────────────────────

function zerioHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Zerio-API-Key': ZERIO_API_KEY,
    ...extra,
  }
  // Revenue-share / affiliate tracking header
  if (ZERIO_REFERRAL_CODE) {
    headers['X-Zerio-Referral'] = ZERIO_REFERRAL_CODE
  }
  return headers
}

async function zerioFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (!isZerioConfigured()) {
    throw new Error('Zerio is not configured. Set VITE_ZERIO_API_KEY in your .env file.')
  }

  const url = `${ZERIO_BASE_URL}${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      ...zerioHeaders(),
      ...(options.headers as Record<string, string> || {}),
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(
      body.error || body.message || `Zerio API error: ${response.status} ${response.statusText}`
    )
  }

  return response.json()
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Get the Zerio OAuth URL for connecting all platforms.
 * The user will be redirected to Zerio's hosted OAuth flow where they
 * can select which platforms to connect.
 *
 * @param redirectUri - Your app's callback URL (e.g., https://yourapp.com/oauth/callback)
 * @param userId - The current user's ID (used for state/CSRF and attribution)
 * @returns Auth URL and session ID
 */
export async function getAuthUrl(
  redirectUri: string,
  userId: string
): Promise<ZerioAuthUrlResponse> {
  const params = new URLSearchParams({
    redirect_uri: redirectUri,
    state: userId,
    // Request all 8 platforms — Zerio lets the user pick which to authorize
    platforms: 'tiktok,instagram,youtube,twitter,linkedin,facebook,pinterest,snapchat',
  })

  if (ZERIO_REFERRAL_CODE) {
    params.set('referral', ZERIO_REFERRAL_CODE)
  }

  return zerioFetch<ZerioAuthUrlResponse>(
    `/auth/url?${params.toString()}`
  )
}

/**
 * Exchange an OAuth authorization code for platform connections.
 * Called from your OAuth callback page after Zerio redirects back.
 *
 * @param code - The authorization code from Zerio's redirect
 * @param userId - The current user's ID (for state validation)
 * @returns Array of platform connections
 */
export async function exchangeCode(
  code: string,
  userId: string
): Promise<ZerioConnection[]> {
  const result = await zerioFetch<{ connections: ZerioConnection[] }>(
    '/auth/token',
    {
      method: 'POST',
      body: JSON.stringify({ code, user_id: userId }),
    }
  )
  return result.connections || []
}

/**
 * Get all connections for a user from Zerio.
 * Useful for syncing connection state.
 */
export async function getConnections(userId: string): Promise<ZerioConnection[]> {
  const result = await zerioFetch<{ connections: ZerioConnection[] }>(
    `/connections?user_id=${encodeURIComponent(userId)}`
  )
  return result.connections || []
}

/**
 * Disconnect a platform via Zerio.
 * This revokes the OAuth token on Zerio's side and marks the connection inactive.
 */
export async function disconnectPlatform(
  userId: string,
  platform: Platform
): Promise<void> {
  await zerioFetch(
    `/connections/${encodeURIComponent(platform)}?user_id=${encodeURIComponent(userId)}`,
    { method: 'DELETE' }
  )
}

/**
 * Post content to a platform via Zerio.
 */
export async function postContent(
  userId: string,
  platform: Platform,
  content: ZerioPostContent
): Promise<ZerioPostResult> {
  return zerioFetch<ZerioPostResult>('/post', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      platform,
      ...content,
    }),
  })
}

/**
 * Get analytics for a specific post from Zerio.
 */
export async function getPostAnalytics(
  userId: string,
  zerioPostId: string
): Promise<ZerioAnalytics> {
  return zerioFetch<ZerioAnalytics>(
    `/analytics/${encodeURIComponent(zerioPostId)}?user_id=${encodeURIComponent(userId)}`
  )
}

/**
 * Get analytics for all posts across platforms from Zerio.
 */
export async function getAllAnalytics(
  userId: string,
  options: { days?: number; platform?: Platform } = {}
): Promise<ZerioAnalytics[]> {
  const params = new URLSearchParams({ user_id: userId })
  if (options.days) params.set('days', String(options.days))
  if (options.platform) params.set('platform', options.platform)

  const result = await zerioFetch<{ analytics: ZerioAnalytics[] }>(
    `/analytics?${params.toString()}`
  )
  return result.analytics || []
}

/**
 * Check the health/status of the Zerio API.
 */
export async function pingZerio(): Promise<{ status: string; timestamp: string }> {
  return zerioFetch('/ping')
}

// ── Sync helper ────────────────────────────────────────────────

/**
 * Sync Zerio connections to the local platform_connections table.
 * Call this after exchanging codes or whenever you need to reconcile state.
 *
 * Returns the platform_connections rows ready to upsert.
 */
export function zerioConnectionsToRows(
  connections: ZerioConnection[],
  userId: string
): Array<{
  user_id: string
  platform: Platform
  access_token: string
  refresh_token: string | null
  account_id: string
  account_name: string
  account_avatar: string | null
  expires_at: string | null
  is_active: boolean
  zerio_connection_id: string
  provider: 'zerio'
}> {
  return connections.map(c => ({
    user_id: userId,
    platform: c.platform,
    access_token: c.access_token,
    refresh_token: c.refresh_token,
    account_id: c.account_id,
    account_name: c.account_name,
    account_avatar: c.account_avatar,
    expires_at: c.expires_at,
    is_active: c.is_active,
    zerio_connection_id: c.id,
    provider: 'zerio' as const,
  }))
}
