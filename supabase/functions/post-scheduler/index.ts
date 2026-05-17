import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// Module-level client uses auto-injected service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ── Types ──────────────────────────────────────────────────────────

interface ScheduledPost {
  id: string
  user_id: string
  platform: string
  content_piece_id: string
  scheduled_for: string
  status: string
  platform_post_id: string | null
  error_message: string | null
}

interface ContentPiece {
  id: string
  caption: string | null
  hashtags: string[]
  video_url: string | null
  thumbnail_url: string | null
  hook: string | null
  script: string | null
  duration_seconds: number | null
}

interface PlatformConnection {
  id: string
  user_id: string
  platform: string
  access_token: string
  refresh_token: string | null
  account_id: string
  expires_at: string | null
  is_active: boolean
}

// ── Main handler ───────────────────────────────────────────────────

serve(async (req: Request) => {
  // Resolve SCHEDULER_SECRET: prefer env var, fall back to app_secrets table
  let schedulerSecret = Deno.env.get('SCHEDULER_SECRET') ?? ''
  if (!schedulerSecret) {
    const { data } = await supabase.from('app_secrets').select('value').eq('key', 'SCHEDULER_SECRET').single()
    schedulerSecret = data?.value ?? ''
  }

  const secret = req.headers.get('x-scheduler-secret')
  if (schedulerSecret && secret !== schedulerSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const now = new Date().toISOString()

  // Fetch all posts that are due
  const { data: posts, error } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_for', now)
    .limit(50) // Process at most 50 per cron run to avoid timeout

  if (error) {
    console.error('Failed to fetch scheduled posts:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!posts || posts.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const results = await Promise.allSettled(
    posts.map((post: ScheduledPost) => publishPost(post))
  )

  const succeeded = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  console.log(`Scheduler run: ${succeeded} succeeded, ${failed} failed`)

  return new Response(JSON.stringify({ processed: posts.length, succeeded, failed }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

// ── Per-post publishing ────────────────────────────────────────────

async function publishPost(post: ScheduledPost): Promise<void> {
  // Mark as processing so parallel cron runs don't double-publish
  const { error: lockError } = await supabase
    .from('scheduled_posts')
    .update({ status: 'processing' })
    .eq('id', post.id)
    .eq('status', 'scheduled') // Optimistic lock

  if (lockError) {
    // Another worker grabbed it
    return
  }

  try {
    // Load the content piece
    const { data: piece, error: pieceError } = await supabase
      .from('content_pieces')
      .select('id, caption, hashtags, video_url, thumbnail_url, hook, script, duration_seconds')
      .eq('id', post.content_piece_id)
      .single()

    if (pieceError || !piece) throw new Error(`Content piece not found: ${post.content_piece_id}`)

    // Load the active platform connection for this user + platform
    const { data: conn, error: connError } = await supabase
      .from('platform_connections')
      .select('id, user_id, platform, access_token, refresh_token, account_id, expires_at, is_active')
      .eq('user_id', post.user_id)
      .eq('platform', post.platform)
      .eq('is_active', true)
      .maybeSingle()

    if (connError || !conn) throw new Error(`No active connection for ${post.platform}`)

    // Refresh token if near expiry
    const refreshedConn = await maybeRefreshToken(conn as PlatformConnection)

    // Publish to the platform
    let platformPostId: string

    switch (post.platform) {
      case 'youtube':
        platformPostId = await publishYouTube(refreshedConn, piece as ContentPiece)
        break
      case 'tiktok':
        platformPostId = await publishTikTok(refreshedConn, piece as ContentPiece)
        break
      case 'instagram':
        platformPostId = await publishInstagram(refreshedConn, piece as ContentPiece)
        break
      case 'twitter':
        platformPostId = await publishTwitter(refreshedConn, piece as ContentPiece)
        break
      case 'linkedin':
        platformPostId = await publishLinkedIn(refreshedConn, piece as ContentPiece)
        break
      case 'facebook':
        platformPostId = await publishFacebook(refreshedConn, piece as ContentPiece)
        break
      case 'pinterest':
        platformPostId = await publishPinterest(refreshedConn, piece as ContentPiece)
        break
      default:
        throw new Error(`Publishing to ${post.platform} not yet implemented`)
    }

    // Mark success
    await supabase
      .from('scheduled_posts')
      .update({ status: 'posted', posted_at: new Date().toISOString(), platform_post_id: platformPostId })
      .eq('id', post.id)

    // Also update the content piece status
    await supabase
      .from('content_pieces')
      .update({ status: 'posted', posted_at: new Date().toISOString() })
      .eq('id', post.content_piece_id)

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown publish error'
    console.error(`Failed to publish post ${post.id}:`, message)

    await supabase
      .from('scheduled_posts')
      .update({ status: 'failed', error_message: message })
      .eq('id', post.id)
  }
}

// ── Token refresh ──────────────────────────────────────────────────

async function maybeRefreshToken(conn: PlatformConnection): Promise<PlatformConnection> {
  if (!conn.refresh_token || !conn.expires_at) return conn

  const expiresAt = new Date(conn.expires_at).getTime()
  const fiveMinutes = 5 * 60 * 1000
  if (Date.now() + fiveMinutes < expiresAt) return conn // Token still valid

  // Platform-specific refresh
  let newAccessToken = conn.access_token
  let newExpiresAt = conn.expires_at

  try {
    if (conn.platform === 'youtube') {
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID') ?? ''
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? ''
      const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: conn.refresh_token,
          grant_type: 'refresh_token',
        }),
      })
      const data = await resp.json()
      if (resp.ok && data.access_token) {
        newAccessToken = data.access_token
        newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
      }
    } else if (conn.platform === 'twitter') {
      const clientId = Deno.env.get('TWITTER_CLIENT_ID') ?? ''
      const clientSecret = Deno.env.get('TWITTER_CLIENT_SECRET') ?? ''
      const resp = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Basic ' + btoa(`${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`),
        },
        body: new URLSearchParams({
          refresh_token: conn.refresh_token,
          grant_type: 'refresh_token',
        }),
      })
      const data = await resp.json()
      if (resp.ok && data.access_token) {
        newAccessToken = data.access_token
        newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
      }
    }
    // LinkedIn, TikTok, Pinterest have similar refresh flows — add as needed

    if (newAccessToken !== conn.access_token) {
      await supabase
        .from('platform_connections')
        .update({ access_token: newAccessToken, expires_at: newExpiresAt })
        .eq('id', conn.id)
      return { ...conn, access_token: newAccessToken, expires_at: newExpiresAt }
    }
  } catch (err) {
    console.warn(`Token refresh failed for ${conn.platform}:`, err)
  }

  return conn
}

// ── Platform publishers ────────────────────────────────────────────

async function publishYouTube(conn: PlatformConnection, piece: ContentPiece): Promise<string> {
  if (!piece.video_url) throw new Error('No video URL on content piece')

  const caption = buildCaption(piece)
  const title = piece.hook || caption.slice(0, 100)

  // Step 1: Initiate a resumable upload
  const initResp = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${conn.access_token}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': 'video/*',
      },
      body: JSON.stringify({
        snippet: {
          title: title.slice(0, 100),
          description: caption,
          categoryId: '22', // People & Blogs
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      }),
    }
  )

  if (!initResp.ok) {
    const err = await initResp.text()
    throw new Error(`YouTube upload initiation failed: ${err}`)
  }

  const uploadUrl = initResp.headers.get('Location')
  if (!uploadUrl) throw new Error('YouTube did not return an upload URL')

  // Step 2: Fetch the video and pipe it to YouTube
  const videoResp = await fetch(piece.video_url)
  if (!videoResp.ok) throw new Error(`Failed to fetch video from storage: ${videoResp.status}`)

  const videoBuffer = await videoResp.arrayBuffer()
  const contentType = videoResp.headers.get('Content-Type') || 'video/mp4'

  const uploadResp = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Content-Length': videoBuffer.byteLength.toString(),
    },
    body: videoBuffer,
  })

  if (!uploadResp.ok) {
    const err = await uploadResp.text()
    throw new Error(`YouTube video upload failed: ${err}`)
  }

  const data = await uploadResp.json()
  if (!data.id) throw new Error('YouTube did not return a video ID')

  return data.id
}

async function publishTikTok(conn: PlatformConnection, piece: ContentPiece): Promise<string> {
  if (!piece.video_url) throw new Error('No video URL on content piece')

  const caption = buildCaption(piece)

  // TikTok Content Posting API v2
  // Step 1: Initialize upload
  const initResp = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${conn.access_token}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        title: caption.slice(0, 2200),
        privacy_level: 'SELF_ONLY', // Start private for safety; can change to PUBLIC_TO_EVERYONE
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1000,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: piece.video_url,
      },
    }),
  })

  if (!initResp.ok) {
    const err = await initResp.text()
    throw new Error(`TikTok publish init failed: ${err}`)
  }

  const initData = await initResp.json()
  if (initData.error?.code && initData.error.code !== 'ok') {
    throw new Error(`TikTok error: ${initData.error.message}`)
  }

  return initData.data?.publish_id || initData.data?.video_id || 'tiktok_pending'
}

async function publishInstagram(conn: PlatformConnection, piece: ContentPiece): Promise<string> {
  if (!piece.video_url) throw new Error('No video URL on content piece')

  const caption = buildCaption(piece)

  // Step 1: Create container
  const containerResp = await fetch(
    `https://graph.instagram.com/${conn.account_id}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'REELS',
        video_url: piece.video_url,
        caption,
        share_to_feed: true,
        access_token: conn.access_token,
      }),
    }
  )

  if (!containerResp.ok) {
    const err = await containerResp.text()
    throw new Error(`Instagram container creation failed: ${err}`)
  }

  const containerData = await containerResp.json()
  if (containerData.error) throw new Error(containerData.error.message)

  const containerId: string = containerData.id
  if (!containerId) throw new Error('Instagram did not return a container ID')

  // Step 2: Poll until container is ready (up to 60 seconds)
  for (let i = 0; i < 12; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000))
    const statusResp = await fetch(
      `https://graph.instagram.com/${containerId}?fields=status_code&access_token=${conn.access_token}`
    )
    const statusData = await statusResp.json()
    if (statusData.status_code === 'FINISHED') break
    if (statusData.status_code === 'ERROR') throw new Error('Instagram media processing failed')
  }

  // Step 3: Publish
  const publishResp = await fetch(
    `https://graph.instagram.com/${conn.account_id}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: conn.access_token,
      }),
    }
  )

  if (!publishResp.ok) {
    const err = await publishResp.text()
    throw new Error(`Instagram publish failed: ${err}`)
  }

  const publishData = await publishResp.json()
  if (publishData.error) throw new Error(publishData.error.message)

  return publishData.id || containerId
}

async function publishTwitter(conn: PlatformConnection, piece: ContentPiece): Promise<string> {
  const text = buildCaption(piece, 280) // Twitter character limit

  const resp = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${conn.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Twitter post failed: ${err}`)
  }

  const data = await resp.json()
  if (data.errors) throw new Error(data.errors[0]?.message || 'Twitter error')

  return data.data?.id || 'twitter_post'
}

async function publishLinkedIn(conn: PlatformConnection, piece: ContentPiece): Promise<string> {
  const text = buildCaption(piece, 3000)

  // Text-only LinkedIn post (video upload requires a multi-step process)
  const resp = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${conn.access_token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: `urn:li:person:${conn.account_id}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }),
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`LinkedIn post failed: ${err}`)
  }

  const postId = resp.headers.get('x-restli-id') || 'linkedin_post'
  return postId
}

async function publishFacebook(conn: PlatformConnection, piece: ContentPiece): Promise<string> {
  const message = buildCaption(piece)

  // Post to the user's timeline (requires pages_manage_posts if posting to a Page)
  const resp = await fetch(
    `https://graph.facebook.com/${conn.account_id}/feed`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        access_token: conn.access_token,
      }),
    }
  )

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Facebook post failed: ${err}`)
  }

  const data = await resp.json()
  if (data.error) throw new Error(data.error.message)

  return data.id || 'facebook_post'
}

async function publishPinterest(conn: PlatformConnection, piece: ContentPiece): Promise<string> {
  if (!piece.thumbnail_url && !piece.video_url) throw new Error('No media URL on content piece')

  const description = buildCaption(piece, 500)

  const resp = await fetch('https://api.pinterest.com/v5/pins', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${conn.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: piece.hook?.slice(0, 100) || description.slice(0, 100),
      description,
      media_source: {
        source_type: piece.video_url ? 'video_id' : 'image_url',
        url: piece.thumbnail_url || piece.video_url,
      },
    }),
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Pinterest pin creation failed: ${err}`)
  }

  const data = await resp.json()
  if (data.code) throw new Error(data.message || 'Pinterest error')

  return data.id || 'pinterest_pin'
}

// ── Helpers ────────────────────────────────────────────────────────

function buildCaption(piece: ContentPiece, maxLength?: number): string {
  const tags = (piece.hashtags || []).map((t: string) => t.startsWith('#') ? t : `#${t}`).join(' ')
  let caption = [piece.caption, tags].filter(Boolean).join('\n\n')
  if (maxLength && caption.length > maxLength) {
    caption = caption.slice(0, maxLength - 3) + '...'
  }
  return caption || 'Posted via Virlo'
}
