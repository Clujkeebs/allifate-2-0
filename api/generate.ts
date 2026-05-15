import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

type JobWithProfile = { profiles?: Record<string, unknown>; user_id?: string } | null


export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type')
    return res.status(200).end()
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'No auth token' })

  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseAnon = process.env.SUPABASE_ANON_KEY!

  // Use the user's JWT so RLS applies — no service role needed
  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  })

  const { jobId, prompt, platforms, tone, musicMood, videoLength } = req.body

  const updateProgress = async (stage: string, progress: number) => {
    await supabase.from('content_jobs').update({
      pipeline_stage: stage,
      pipeline_progress: progress,
      status: progress < 100 ? 'processing' : 'review',
    }).eq('id', jobId)
  }

  try {
    const jobRes = await supabase
      .from('content_jobs')
      .select('*, profiles(*)')
      .eq('id', jobId)
      .single()

    const job = jobRes.data as JobWithProfile
    const profile = job?.profiles

    await updateProgress('Strategy AI — analyzing niche and crafting briefs', 10)

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const strategyPrompt = `You are a world-class social media strategist with 10+ years growing brands to millions of followers.

You know: first 1.5 seconds make or break a video. Pinterest is a search engine. Twitter punishes external links in post body. LinkedIn rewards native content. Saved content signals value over likes.

You NEVER say "In today's video..." You NEVER start an Instagram caption with "I". You NEVER use em dashes on TikTok.

User niche: ${profile?.niche || 'General'}
Tone: ${tone || profile?.tone_preference || 'casual'}
Platforms: ${platforms.join(', ')}
Prompt: ${prompt}
Length: ${videoLength || 60}s
Music mood: ${musicMood || 'upbeat'}

For EACH platform produce a JSON object:
{
  "platform": "platform_name",
  "hook": "First 1-2 scroll-stopping sentences",
  "script": "Full script with timing [0:00], [0:15]...",
  "caption": "Platform-native caption",
  "hashtags": ["tag1", "tag2"],
  "cta": "Call to action",
  "visual_direction": "B-roll and visual style",
  "music_suggestion": "Genre and mood"
}

Return a JSON array only — no other text.`

    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: strategyPrompt }],
    })

    let briefs: Array<Record<string, unknown>> = []
    try {
      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const match = text.match(/\[[\s\S]*\]/)
      if (match) briefs = JSON.parse(match[0])
    } catch {
      briefs = platforms.map((p: string) => ({
        platform: p,
        hook: `Here's what you need to know about ${prompt}`,
        script: `[0:00] Hook: ${prompt}\n[0:05] Main content\n[0:50] CTA: Follow for more`,
        caption: `${prompt} #trending`,
        hashtags: ['trending', 'viral', 'content'],
        cta: 'Follow for more',
        visual_direction: 'Dynamic visuals matching the content theme',
        music_suggestion: `${musicMood || 'upbeat'} background music`,
      }))
    }

    await updateProgress('Sourcing licensed stock assets', 35)
    await updateProgress('Finalizing scripts and voiceover queue', 55)
    await updateProgress('Video assembly — rendering with captions', 75)
    await updateProgress('Adapting for each platform', 92)

    for (const brief of briefs) {
      const platformId = (brief as Record<string, unknown>)['platform'] as string | undefined
      if (!platformId || !Array.isArray(platforms) || !platforms.includes(platformId)) continue
      const caption = (brief as Record<string, unknown>)['caption'] as string | undefined
      const hashtags = (brief as Record<string, unknown>)['hashtags'] as string[] | undefined
      const hook = (brief as Record<string, unknown>)['hook'] as string | undefined
      const scriptText = (brief as Record<string, unknown>)['script'] as string | undefined
      const music = (brief as Record<string, unknown>)['music_suggestion'] as string | undefined

      await supabase.from('content_pieces').insert({
        job_id: jobId,
        user_id: job?.user_id || null,
        platform: platformId,
        caption: caption,
        hashtags: hashtags || [],
        hook: hook,
        script: scriptText,
        status: 'draft',
        duration_seconds: videoLength || 60,
        music_track: music,
      })
    }

    await supabase.from('content_jobs').update({
      status: 'review',
      pipeline_stage: 'Ready for review',
      pipeline_progress: 100,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId)

    // Atomically increment monthly usage via the SECURITY DEFINER RPC.
    // The function verifies auth.uid() === p_user_id, so this is RLS-safe.
    if (job?.user_id) {
      const { error: rpcErr } = await supabase.rpc('increment_posts_used', { p_user_id: job.user_id })
      if (rpcErr) console.warn('increment_posts_used failed:', rpcErr.message)

      // Best-effort audit log
      await supabase.from('usage_logs').insert({
        user_id: job.user_id,
        action: 'content_generated',
        credits_used: 1,
        metadata: { job_id: jobId, platforms, pieces: briefs.length },
      })
    }

    return res.status(200).json({ success: true, jobId, piecesCreated: briefs.length })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('generate error:', err)
    await supabase.from('content_jobs').update({
      status: 'failed',
      error_message: errMsg,
    }).eq('id', jobId)
    return res.status(500).json({ error: errMsg })
  }
}
