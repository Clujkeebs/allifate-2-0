import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

// ── Configuration ──────────────────────────────────────────────
const ZAPIER_WEBHOOK_SECRET = process.env.ZAPIER_WEBHOOK_SECRET
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Singleton Supabase admin client (reused across warm invocations)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabaseAdmin: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSupabaseAdmin(): any {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  }
  return supabaseAdmin
}

// ── Security helpers ───────────────────────────────────────────

function validateSignature(req: VercelRequest): boolean {
  if (!ZAPIER_WEBHOOK_SECRET) {
    console.warn('ZAPIER_WEBHOOK_SECRET not configured — accepting all requests')
    return true
  }
  const signature = req.headers['x-zapier-signature'] as string
  if (!signature) return false
  // Constant-time comparison (production-grade)
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(ZAPIER_WEBHOOK_SECRET)
    )
  } catch {
    return signature === ZAPIER_WEBHOOK_SECRET
  }
}

async function resolveUser(req: VercelRequest): Promise<string | null> {
  const admin = getSupabaseAdmin()

  // ── Method 1: JWT Bearer token (from Supabase auth) ──
  const authHeader = req.headers['authorization'] as string
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data } = await admin.auth.getUser(token)
    if (data?.user?.id) return data.user.id
  }

  // ── Method 2: API Key + User ID header ──
  const apiKey = req.headers['x-api-key'] as string
  const userId = req.headers['x-user-id'] as string

  if (apiKey && userId) {
    // Validate API key against the user's stored key in profiles
    const { data: profile } = await admin
      .from('profiles')
      .select('id, api_key')
      .eq('id', userId)
      .single()

    if (profile?.api_key && profile.api_key === apiKey) {
      return profile.id
    }

    // Fallback: if no user-specific key is stored, validate against global secret
    const GLOBAL_API_KEY = process.env.ZAPIER_GLOBAL_API_KEY
    if (GLOBAL_API_KEY && apiKey === GLOBAL_API_KEY) {
      // Verify the user exists
      const { data } = await admin
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single()
      if (data?.id) return data.id
    }

    return null
  }

  return null
}

// ── Handler ────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-API-Key, X-User-Id, X-Zapier-Signature'
  )

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  // Validate webhook signature
  if (!validateSignature(req)) {
    return res.status(401).json({ error: 'Invalid webhook signature' })
  }

  // Authenticate user
  const userId = await resolveUser(req)
  if (!userId) {
    return res.status(401).json({
      error:
        'Invalid authentication. Provide a Supabase Bearer token, or X-API-Key + X-User-Id headers with a valid API key.',
    })
  }

  const admin = getSupabaseAdmin()
  const { action, payload } = req.body || {}

  if (!action) {
    return res.status(400).json({ error: 'Missing "action" field in request body.' })
  }

  try {
    switch (action) {
      // ── Trigger content generation ──
      case 'create_content': {
        const { prompt, platforms, tone, niche } = payload || {}
        if (!prompt) {
          return res.status(400).json({ error: 'Missing "prompt" in payload.' })
        }

        const { data: job, error } = await admin
          .from('content_jobs')
          .insert({
            user_id: userId,
            prompt,
            platforms: platforms || [
              'tiktok', 'instagram', 'youtube', 'twitter',
              'linkedin', 'facebook', 'pinterest', 'snapchat',
            ],
            tone: tone || 'professional',
            niche: niche || '',
            status: 'pending',
          })
          .select()
          .single()

        if (error) throw error

        return res.status(201).json({
          success: true,
          message: 'Content generation job created',
          job_id: job.id,
          status: job.status,
        })
      }

      // ── Pull analytics ──
      case 'get_analytics': {
        const { data: analytics } = await admin
          .from('post_analytics')
          .select('*')
          .order('fetched_at', { ascending: false })
          .limit(100)

        return res.status(200).json({
          success: true,
          count: analytics?.length || 0,
          analytics,
        })
      }

      // ── List content pieces ──
      case 'list_content': {
        const { status, limit } = payload || {}
        let query = admin
          .from('content_pieces')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (status) query = query.eq('status', status)
        if (limit) query = query.limit(Number(limit))

        const { data: pieces } = await query

        return res.status(200).json({
          success: true,
          count: pieces?.length || 0,
          pieces,
        })
      }

      // ── Post status update (Zapier → Virlo) ──
      case 'post_status_update': {
        const { content_piece_id, platform, posted_at, post_url, status } = payload || {}
        if (!content_piece_id) {
          return res.status(400).json({ error: 'Missing "content_piece_id" in payload.' })
        }

        const updates: Record<string, unknown> = {}
        if (posted_at) updates.posted_at = posted_at
        if (status) updates.status = status

        const { data: piece, error } = await admin
          .from('content_pieces')
          .update(updates)
          .eq('id', content_piece_id)
          .eq('user_id', userId)
          .select()
          .single()

        if (error) throw error

        // If a post URL is provided, insert/update analytics stub
        if (post_url && platform) {
          await admin.from('post_analytics').upsert(
            {
              content_piece_id,
              platform,
              views: 0,
              likes: 0,
              shares: 0,
              saves: 0,
              fetched_at: new Date().toISOString(),
            },
            { onConflict: 'content_piece_id, platform' }
          )
        }

        return res.status(200).json({
          success: true,
          message: 'Post status updated',
          piece,
        })
      }

      // ── Ping / test ──
      case 'ping': {
        return res.status(200).json({
          success: true,
          message: 'pong',
          timestamp: new Date().toISOString(),
          userId,
        })
      }

      default:
        return res.status(400).json({
          error: `Unknown action: "${action}". Supported: create_content, get_analytics, list_content, post_status_update, ping`,
        })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('Zapier webhook error:', message)
    return res.status(500).json({ error: message })
  }
}
