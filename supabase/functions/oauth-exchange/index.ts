import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

serve(async (req: Request) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Authenticate the request using the user's JWT
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const token = authHeader.slice(7)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Verify the JWT and get the user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Parse the request body
  let body: { platform?: string; code?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { platform, code } = body
  if (!platform || !code) {
    return new Response(JSON.stringify({ error: 'Missing platform or code' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Exchange the authorization code for an access token
  // Each platform has its own OAuth token endpoint
  try {
    const result = await exchangeCode(platform, code)
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Token exchange failed'
    console.error('OAuth exchange error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

async function exchangeCode(platform: string, code: string) {
  switch (platform) {
    case 'tiktok':
      return exchangeTikTok(code)
    case 'instagram':
      return exchangeInstagram(code)
    case 'youtube':
      return exchangeGoogle(code)
    case 'twitter':
      return exchangeTwitter(code)
    case 'linkedin':
      return exchangeLinkedIn(code)
    case 'facebook':
      return exchangeFacebook(code)
    case 'pinterest':
      return exchangePinterest(code)
    case 'snapchat':
      return exchangeSnapchat(code)
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
}

// ── Platform-specific OAuth exchange implementations ──────────

async function exchangeTikTok(code: string) {
  const clientId = Deno.env.get('TIKTOK_CLIENT_KEY') ?? ''
  const clientSecret = Deno.env.get('TIKTOK_CLIENT_SECRET') ?? ''
  if (!clientId || !clientSecret) throw new Error('TikTok OAuth credentials not configured')

  const resp = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${Deno.env.get('APP_ORIGIN') ?? 'http://localhost:5173'}/oauth/callback?platform=tiktok`,
    }),
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error(data.error_description || data.error || 'TikTok exchange failed')
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    account_id: data.open_id,
    account_name: data.display_name || '@tiktok_user',
    expires_in: data.expires_in,
  }
}

async function exchangeInstagram(code: string) {
  const appId = Deno.env.get('META_APP_ID') ?? ''
  const appSecret = Deno.env.get('META_APP_SECRET') ?? ''
  if (!appId || !appSecret) throw new Error('Instagram OAuth credentials not configured')

  const redirectUri = `${Deno.env.get('APP_ORIGIN') ?? 'http://localhost:5173'}/oauth/callback?platform=instagram`

  // Step 1: Exchange code for short-lived access token
  const tokenResp = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  })
  const tokenData = await tokenResp.json()
  if (!tokenResp.ok) throw new Error(tokenData.error_message || 'Instagram exchange failed')

  // Step 2: Exchange for long-lived token (60 days)
  const longResp = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${tokenData.access_token}`
  )
  const longData = await longResp.json()
  if (!longResp.ok) throw new Error(longData.error?.message || 'Instagram long-lived token exchange failed')

  // Step 3: Get user profile
  const profileResp = await fetch(
    `https://graph.instagram.com/me?fields=id,username&access_token=${longData.access_token}`
  )
  const profileData = await profileResp.json()

  return {
    access_token: longData.access_token,
    refresh_token: null,
    account_id: profileData.id || tokenData.user_id?.toString(),
    account_name: profileData.username || '@instagram_user',
    expires_in: longData.expires_in || 5184000, // 60 days
  }
}

async function exchangeGoogle(code: string) {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID') ?? ''
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? ''
  if (!clientId || !clientSecret) throw new Error('Google OAuth credentials not configured')

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${Deno.env.get('APP_ORIGIN') ?? 'http://localhost:5173'}/oauth/callback?platform=youtube`,
    }),
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error(data.error_description || data.error || 'Google exchange failed')

  // Get YouTube channel info
  let channelId = ''
  let channelName = ''
  try {
    const channelResp = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      { headers: { Authorization: `Bearer ${data.access_token}` } }
    )
    const channelData = await channelResp.json()
    if (channelData.items?.length > 0) {
      channelId = channelData.items[0].id
      channelName = channelData.items[0].snippet?.title
    }
  } catch { /* channel info is optional */ }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    account_id: channelId || 'google_user',
    account_name: channelName || '@youtube_user',
    expires_in: data.expires_in,
  }
}

async function exchangeTwitter(code: string) {
  const clientId = Deno.env.get('TWITTER_CLIENT_ID') ?? ''
  const clientSecret = Deno.env.get('TWITTER_CLIENT_SECRET') ?? ''
  if (!clientId || !clientSecret) throw new Error('Twitter OAuth credentials not configured')

  const resp = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + btoa(encodeURIComponent(clientId) + ':' + encodeURIComponent(clientSecret)),
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${Deno.env.get('APP_ORIGIN') ?? 'http://localhost:5173'}/oauth/callback?platform=twitter`,
      code_verifier: 'challenge', // Must match the code_challenge sent in the auth request
    }),
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error(data.error_description || data.error || 'Twitter exchange failed')

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    account_id: 'twitter_user',
    account_name: '@twitter_user',
    expires_in: data.expires_in,
  }
}

async function exchangeLinkedIn(code: string) {
  const clientId = Deno.env.get('LINKEDIN_CLIENT_ID') ?? ''
  const clientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET') ?? ''
  if (!clientId || !clientSecret) throw new Error('LinkedIn OAuth credentials not configured')

  const resp = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${Deno.env.get('APP_ORIGIN') ?? 'http://localhost:5173'}/oauth/callback?platform=linkedin`,
    }),
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error(data.error_description || data.error || 'LinkedIn exchange failed')

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    account_id: data.id || 'linkedin_user',
    account_name: data.name || '@linkedin_user',
    expires_in: data.expires_in,
  }
}

async function exchangeFacebook(code: string) {
  const appId = Deno.env.get('META_APP_ID') ?? ''
  const appSecret = Deno.env.get('META_APP_SECRET') ?? ''
  if (!appId || !appSecret) throw new Error('Facebook OAuth credentials not configured')

  const resp = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      code,
      redirect_uri: `${Deno.env.get('APP_ORIGIN') ?? 'http://localhost:5173'}/oauth/callback?platform=facebook`,
    }),
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error(data.error?.message || data.error_description || 'Facebook exchange failed')

  // Get user info
  let accountName = '@facebook_user'
  try {
    const meResp = await fetch(
      `https://graph.facebook.com/me?fields=name&access_token=${data.access_token}`
    )
    const meData = await meResp.json()
    if (meData.name) accountName = meData.name
  } catch { /* optional */ }

  return {
    access_token: data.access_token,
    refresh_token: null,
    account_id: 'facebook_user',
    account_name: accountName,
    expires_in: data.expires_in || 5184000,
  }
}

async function exchangePinterest(code: string) {
  const appId = Deno.env.get('PINTEREST_APP_ID') ?? ''
  const appSecret = Deno.env.get('PINTEREST_APP_SECRET') ?? ''
  if (!appId || !appSecret) throw new Error('Pinterest OAuth credentials not configured')

  const resp = await fetch('https://api.pinterest.com/v5/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + btoa(`${appId}:${appSecret}`),
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${Deno.env.get('APP_ORIGIN') ?? 'http://localhost:5173'}/oauth/callback?platform=pinterest`,
    }),
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error(data.error_description || data.message || 'Pinterest exchange failed')

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    account_id: data.user_id || 'pinterest_user',
    account_name: data.username || '@pinterest_user',
    expires_in: data.expires_in,
  }
}

async function exchangeSnapchat(code: string) {
  const clientId = Deno.env.get('SNAPCHAT_CLIENT_ID') ?? ''
  const clientSecret = Deno.env.get('SNAPCHAT_CLIENT_SECRET') ?? ''
  if (!clientId || !clientSecret) throw new Error('Snapchat OAuth credentials not configured')

  const resp = await fetch('https://accounts.snapchat.com/accounts/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${Deno.env.get('APP_ORIGIN') ?? 'http://localhost:5173'}/oauth/callback?platform=snapchat`,
    }),
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error(data.error_description || data.error || 'Snapchat exchange failed')

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    account_id: data.organization_id || 'snapchat_user',
    account_name: data.organization_name || '@snapchat_user',
    expires_in: data.expires_in,
  }
}
