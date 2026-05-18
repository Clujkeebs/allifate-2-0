import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

/**
 * Zernio Webhook Endpoint
 *
 * Receives incoming webhooks from Zernio:
 * - post.status — Post status updates (published, failed)
 * - post.analytics — Analytics data push
 * - connection.disconnected — Platform disconnected
 * - connection.refreshed — Token refreshed
 *
 * Set this URL in your Zernio dashboard:
 *   https://your-domain.com/api/zernio-webhook
 */

// ── Configuration ──────────────────────────────────────────────

const ZERNIO_WEBHOOK_SECRET = process.env.ZERNIO_WEBHOOK_SECRET || ''
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Singleton Supabase admin client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabaseAdmin: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSupabaseAdmin(): any {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  }
  return supabaseAdmin
}

// ── Security ───────────────────────────────────────────────────

function validateSignature(req: VercelRequest): boolean {
  if (!ZERNIO_WEBHOOK_SECRET) {
    console.warn('ZERNIO_WEBHOOK_SECRET not configured — accepting all requests')
    return true
  }
  const signature = req.headers['x-zernio-signature'] as string
  if (!signature) return false

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(ZERNIO_WEBHOOK_SECRET)
    )
  } catch {
    return signature === ZERNIO_WEBHOOK_SECRET
  }
}

// ── Handler ────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Zernio-Signature')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  if (!validateSignature(req)) {
    return res.status(401).json({ error: 'Invalid webhook signature' })
  }

  const admin = getSupabaseAdmin()
  const { event, data } = req.body || {}

  if (!event || !data) {
    return res.status(400).json({ error: 'Missing "event" or "data" in request body.' })
  }

  try {
    switch (event) {
      // ── Post status update (Zernio → Virlo) ──
      case 'post.status': {
        const { zernio_post_id, platform_post_id, status, error_message } = data
        if (!zernio_post_id) {
          return res.status(400).json({ error: 'Missing "zernio_post_id"' })
        }

        // Find the scheduled post by Zernio post ID
        const { data: schedules } = await admin
          .from('scheduled_posts')
          .select('id, content_piece_id')
          .eq('platform_post_id', zernio_post_id)
          .limit(1)

        if (schedules?.length) {
          await admin
            .from('scheduled_posts')
            .update({
              status: status === 'published' ? 'posted' : status === 'failed' ? 'failed' : 'posted',
              platform_post_id: platform_post_id || schedules[0].platform_post_id,
              posted_at: status === 'published' ? new Date().toISOString() : undefined,
              error_message: error_message || null,
            })
            .eq('id', schedules[0].id)

          // Update content piece status too
          if (schedules[0].content_piece_id) {
            await admin
              .from('content_pieces')
              .update({ posted_at: new Date().toISOString() })
              .eq('id', schedules[0].content_piece_id)
          }
        }

        return res.status(200).json({ success: true, message: 'Post status updated' })
      }

      // ── Analytics push (Zernio → Virlo) ──
      case 'post.analytics': {
        const { content_piece_id, platform, views, likes, shares, comments, saves, watch_time_avg, click_rate } = data
        if (!content_piece_id) {
          return res.status(400).json({ error: 'Missing "content_piece_id"' })
        }

        await admin.from('post_analytics').upsert(
          {
            content_piece_id,
            platform: platform || 'tiktok',
            views: views || 0,
            likes: likes || 0,
            shares: shares || 0,
            comments: comments || 0,
            saves: saves || 0,
            watch_time_avg: watch_time_avg || null,
            click_rate: click_rate || null,
            fetched_at: new Date().toISOString(),
          },
          { onConflict: 'content_piece_id, platform' }
        )

        return res.status(200).json({ success: true, message: 'Analytics updated' })
      }

      // ── Connection disconnected (Zernio → Virlo) ──
      case 'connection.disconnected': {
        const { zernio_connection_id } = data
        if (!zernio_connection_id) {
          return res.status(400).json({ error: 'Missing "zernio_connection_id"' })
        }

        await admin
          .from('platform_connections')
          .update({ is_active: false })
          .eq('zernio_connection_id', zernio_connection_id)

        return res.status(200).json({ success: true, message: 'Connection marked inactive' })
      }

      // ── Token refreshed (Zernio → Virlo) ──
      case 'connection.refreshed': {
        const { zernio_connection_id, access_token, refresh_token, expires_at } = data
        if (!zernio_connection_id) {
          return res.status(400).json({ error: 'Missing "zernio_connection_id"' })
        }

        await admin
          .from('platform_connections')
          .update({
            access_token,
            refresh_token: refresh_token || null,
            expires_at: expires_at || null,
          })
          .eq('zernio_connection_id', zernio_connection_id)

        return res.status(200).json({ success: true, message: 'Token refreshed' })
      }

      // ── Ping / health check ──
      case 'ping': {
        return res.status(200).json({ success: true, message: 'pong', timestamp: new Date().toISOString() })
      }

      default:
        return res.status(400).json({
          error: `Unknown event: "${event}". Supported: post.status, post.analytics, connection.disconnected, connection.refreshed, ping`,
        })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('Zernio webhook error:', message)
    return res.status(500).json({ error: message })
  }
}
