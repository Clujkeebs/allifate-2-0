/**
 * Zernio Integration — Social Media API Aggregator
 *
 * Zernio handles multi-platform OAuth, posting, and analytics through a single API.
 * This module abstracts all Zernio interactions and tracks referral/revenue share.
 *
 * When Zernio is not configured (no ZERNIO_API_KEY in env), the module gracefully
 * returns null/disabled — the UI falls back to per-platform OAuth.
 *
 * To enable: set VITE_ZERNIO_API_KEY + ZERNIO_API_SECRET in your .env
 * Referral: set ZERNIO_REFERRAL_CODE to track revenue share
 */

import type { Platform } from '@/types/database'

// ── Types ──────────────────────────────────────────────────────

export interface ZernioConnection {
  /** Zernio's internal connection ID */
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

export interface ZernioPostContent {
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

export interface ZernioPostResult {
  /** Zernio post ID */
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

export interface ZernioAnalytics {
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

export interface ZernioAuthUrlResponse {
  /** URL to redirect the user to for OAuth authorization */
  url: string
  /** Session ID to track this auth attempt */
  session_id: string
}

// ── Configuration ──────────────────────────────────────────────

const ZERNIO_BASE_URL = import.meta.env.VITE_ZERNIO_BASE_URL || 'https://api.zernio.io/v1'
const ZERNIO_API_KEY = import.meta.env.VITE_ZERNIO_API_KEY || ''
const ZERNIO_REFERRAL_CODE = import.meta.env.VITE_ZERNIO_REFERRAL_CODE || ''

/** Whether Zernio is configured and available */
export function isZernioConfigured(): boolean {
  return Boolean(ZERNIO_API_KEY)
}

/** Get the Zernio referral code (for revenue share tracking) */
export function getReferralCode(): string {
  return ZERNIO_REFERRAL_CODE
}

// ── Internal helpers ───────────────────────────────────────────

function zernioHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Zernio-API-Key': ZERNIO_API_KEY,
    ...extra,
  }
  // Revenue-share / affiliate tracking header
  if (ZERNIO_REFERRAL_CODE) {
    headers['X-Zernio-Referral'] = ZERNIO_REFERRAL_CODE
  }
  return headers
}

async function zernioFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (!isZernioConfigured()) {
    throw new Error('Zernio is not configured. Set VITE_ZERNIO_API_KEY in your .env file.')
  }

  const url = `${ZERNIO_BASE_URL}${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      ...zernioHeaders(),
      ...(options.headers as Record<string, string> || {}),
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(
      body.error || body.message || `Zernio API error: ${response.status} ${response.statusText}`
    )
  }

  return response.json()
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Get the Zernio OAuth URL for connecting all platforms.
 * The user will be redirected to Zernio's hosted OAuth flow where they
 * can select which platforms to connect.
 *
 * @param redirectUri - Your app's callback URL (e.g., https://yourapp.com/oauth/callback)
 * @param userId - The current user's ID (used for state/CSRF and attribution)
 * @returns Auth URL and session ID
 */
export async function getAuthUrl(
  redirectUri: string,
  userId: string
): Promise<ZernioAuthUrlResponse> {
  const params = new URLSearchParams({
    redirect_uri: redirectUri,
    state: userId,
    // Request all 8 platforms — Zernio lets the user pick which to authorize
    platforms: 'tiktok,instagram,youtube,twitter,linkedin,facebook,pinterest,snapchat',
  })

  if (ZERNIO_REFERRAL_CODE) {
    params.set('referral', ZERNIO_REFERRAL_CODE)
  }

  return zernioFetch<ZernioAuthUrlResponse>(
    `/auth/url?${params.toString()}`
  )
}

/**
 * Exchange an OAuth authorization code for platform connections.
 * Called from your OAuth callback page after Zernio redirects back.
 *
 * @param code - The authorization code from Zernio's redirect
 * @param userId - The current user's ID (for state validation)
 * @returns Array of platform connections
 */
export async function exchangeCode(
  code: string,
  userId: string
): Promise<ZernioConnection[]> {
  const result = await zernioFetch<{ connections: ZernioConnection[] }>(
    '/auth/token',
    {
      method: 'POST',
      body: JSON.stringify({ code, user_id: userId }),
    }
  )
  return result.connections || []
}

/**
 * Get all connections for a user from Zernio.
 * Useful for syncing connection state.
 */
export async function getConnections(userId: string): Promise<ZernioConnection[]> {
  const result = await zernioFetch<{ connections: ZernioConnection[] }>(
    `/connections?user_id=${encodeURIComponent(userId)}`
  )
  return result.connections || []
}

/**
 * Disconnect a platform via Zernio.
 * This revokes the OAuth token on Zernio's side and marks the connection inactive.
 */
export async function disconnectPlatform(
  userId: string,
  platform: Platform
): Promise<void> {
  await zernioFetch(
    `/connections/${encodeURIComponent(platform)}?user_id=${encodeURIComponent(userId)}`,
    { method: 'DELETE' }
  )
}

/**
 * Post content to a platform via Zernio.
 */
export async function postContent(
  userId: string,
  platform: Platform,
  content: ZernioPostContent
): Promise<ZernioPostResult> {
  return zernioFetch<ZernioPostResult>('/post', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      platform,
      ...content,
    }),
  })
}

/**
 * Get analytics for a specific post from Zernio.
 */
export async function getPostAnalytics(
  userId: string,
  zernioPostId: string
): Promise<ZernioAnalytics> {
  return zernioFetch<ZernioAnalytics>(
    `/analytics/${encodeURIComponent(zernioPostId)}?user_id=${encodeURIComponent(userId)}`
  )
}

/**
 * Get analytics for all posts across platforms from Zernio.
 */
export async function getAllAnalytics(
  userId: string,
  options: { days?: number; platform?: Platform } = {}
): Promise<ZernioAnalytics[]> {
  const params = new URLSearchParams({ user_id: userId })
  if (options.days) params.set('days', String(options.days))
  if (options.platform) params.set('platform', options.platform)

  const result = await zernioFetch<{ analytics: ZernioAnalytics[] }>(
    `/analytics?${params.toString()}`
  )
  return result.analytics || []
}

/**
 * Check the health/status of the Zernio API.
 */
export async function pingZernio(): Promise<{ status: string; timestamp: string }> {
  return zernioFetch('/ping')
}

// ── Sync helper ────────────────────────────────────────────────

/**
 * Sync Zernio connections to the local platform_connections table.
 * Call this after exchanging codes or whenever you need to reconcile state.
 *
 * Returns the platform_connections rows ready to upsert.
 */
export function zernioConnectionsToRows(
  connections: ZernioConnection[],
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
  zernio_connection_id: string
  provider: 'zernio'
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
    zernio_connection_id: c.id,
    provider: 'zernio' as const,
  }))
}
