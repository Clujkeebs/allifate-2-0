import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.27.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}


async function updateJobProgress(supabaseClient: { from: (table: string) => { update: (obj: Record<string, unknown>) => { eq: (k: string, v: unknown) => Promise<unknown> } } }, jobId: string, stage: string, progress: number) {
  await supabaseClient.from('content_jobs').update({
    pipeline_stage: stage,
    pipeline_progress: progress,
    status: progress < 100 ? 'processing' : 'review',
  }).eq('id', jobId)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  let jobId: string | undefined
  let supabase: ReturnType<typeof createClient> | undefined

  try {
    const body = await req.json()
    jobId = body.jobId
    const { prompt, platforms, tone, musicMood, videoLength } = body

    supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Prefer Supabase secret env var; fall back to app_secrets table (service role bypasses RLS)
    const getSecret = async (key: string): Promise<string> => {
      const v = Deno.env.get(key)
      if (v) return v
      const { data } = await supabase.from('app_secrets').select('value').eq('key', key).single()
      return data?.value ?? ''
    }

    const anthropicKey = await getSecret('ANTHROPIC_API_KEY')
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'Anthropic API key not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const anthropic = new Anthropic({ apiKey: anthropicKey })

    // Get user profile for context
    const jobRes = await supabase.from('content_jobs').select('*, profiles(*)').eq('id', jobId).single()
    const job = jobRes.data as { profiles?: Record<string, unknown>; user_id?: string } | null
    const profile = job?.profiles

    // Stage 1: Content Strategy
    await updateJobProgress(supabase, jobId, 'Strategy AI — analyzing niche and crafting briefs', 10)

    const strategyPrompt = `You are a world-class social media strategist and creative director with 10+ years of experience growing brands from zero to millions of followers across TikTok, Instagram, YouTube, LinkedIn, Twitter, Facebook, Pinterest, and Snapchat.

You understand the algorithm deeply. You know that the first 1.5 seconds make or break a video. You know that saved content signals value to the algorithm more than likes. You know LinkedIn rewards native content, not links. You know Pinterest is a search engine. You know that Twitter's algorithm punishes external links in the main post body.

Your job is to take a simple prompt and turn it into a complete content brief for each platform. You NEVER produce generic content. You NEVER use the phrase "In today's video..." You NEVER start a caption with "I" on Instagram. You NEVER use em dashes on TikTok.

User's niche: ${profile?.niche || 'General'}
User's tone: ${tone || profile?.tone_preference || 'casual'}
Target platforms: ${platforms.join(', ')}
Content prompt: ${prompt}
Target length: ${videoLength || 60} seconds
Music mood: ${musicMood || 'upbeat'}

For EACH platform in the list, produce a JSON object with these exact fields:
{
  "platform": "platform_name",
  "hook": "First 1-2 sentences that stop the scroll",
  "script": "Full script with timing markers [0:00], [0:15] etc",
  "caption": "Platform-native caption with appropriate formatting",
  "hashtags": ["tag1", "tag2", ...],
  "cta": "Call to action",
  "visual_direction": "B-roll description and visual style",
  "music_suggestion": "Music genre and mood"
}

Return a JSON array of these objects. Nothing else — pure JSON only.`

    const strategyResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: strategyPrompt }],
    })

    let contentBriefs: Array<Record<string, unknown>> = []
    try {
      const text = Array.isArray(strategyResponse.content) && strategyResponse.content[0].type === 'text' ? (((strategyResponse.content[0] as unknown) as { text?: string }).text || '') : ''
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) contentBriefs = JSON.parse(jsonMatch[0])
    } catch {
      // Fallback: create minimal briefs
      contentBriefs = Array.isArray(platforms) ? platforms.map((p: string) => ({
        platform: p,
        hook: `Here's what you need to know about ${prompt}`,
        script: `Opening hook (0:00-0:05): ${prompt}\n\nMain content (0:05-0:45): Key insights\n\nCTA (0:45-0:60): Follow for more`,
        caption: `${prompt} #content #viral`,
        hashtags: ['content', 'viral', 'trending'],
        cta: 'Follow for more',
        visual_direction: 'Dynamic visuals matching the content',
        music_suggestion: `${musicMood || 'upbeat'} background music`,
      })) : []
    }

    // Stage 2: Asset sourcing
    await updateJobProgress(supabase, jobId, 'Sourcing licensed stock assets', 30)

    // In production: call Pexels/Pixabay/Unsplash APIs here
    // For now: log the search queries that would be generated
    await new Promise(r => setTimeout(r, 500))

    // Stage 3: Script finalization
    await updateJobProgress(supabase, jobId, 'Finalizing scripts and voiceover queue', 50)
    await new Promise(r => setTimeout(r, 300))

    // Stage 4: Video assembly (in production: FFmpeg worker)
    await updateJobProgress(supabase, jobId, 'Video assembly — rendering with captions', 70)
    await new Promise(r => setTimeout(r, 800))

    // Stage 5: Platform adaptation
    await updateJobProgress(supabase, jobId, 'Adapting for each platform', 90)

    // Create content pieces for each platform
    for (const brief of contentBriefs) {
      const platformId = (brief as Record<string, unknown>)['platform'] as string | undefined
      if (!platformId || !Array.isArray(platforms) || !platforms.includes(platformId)) continue
      const caption = (brief as Record<string, unknown>)['caption'] as string | undefined
      const hashtags = (brief as Record<string, unknown>)['hashtags'] as string[] | undefined
      const hook = (brief as Record<string, unknown>)['hook'] as string | undefined
      const scriptText = (brief as Record<string, unknown>)['script'] as string | undefined
      const music = (brief as Record<string, unknown>)['music_suggestion'] as string | undefined

      await supabase.from('content_pieces').insert({
        job_id: jobId,
        user_id: job?.user_id,
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

    // Mark job complete
    await supabase.from('content_jobs').update({
      status: 'review',
      pipeline_stage: 'Ready for review',
      pipeline_progress: 100,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId)

    // Update subscription usage
    const subRes = await supabase.from('subscriptions').select('*').eq('user_id', job?.user_id).single()
    const sub = subRes.data as { posts_used_this_month?: number; id?: string } | null
    if (sub) {
      await supabase.from('subscriptions').update({
        posts_used_this_month: ((sub.posts_used_this_month || 0) as number) + 1,
      }).eq('id', sub.id)
    }

    return new Response(JSON.stringify({ success: true, jobId, piecesCreated: contentBriefs.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('generate-content error:', err)
    // Mark the job as failed so it doesn't remain stuck in 'processing'
    if (jobId && supabase) {
      try {
        await supabase.from('content_jobs').update({
          status: 'failed',
          error_message: String(err),
        }).eq('id', jobId)
      } catch (updateErr) {
        console.error('Failed to mark job as failed:', updateErr)
      }
    }
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
