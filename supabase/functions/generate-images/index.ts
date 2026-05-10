import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * AI Image Generation Edge Function
 *
 * Called from the content generation pipeline when source_mode is 'ai_gen'.
 * Generates AI images for each script section and stores them as user assets.
 *
 * Supported providers: Replicate (Flux), OpenAI (DALL-E 3), Stability AI (SD3.5)
 * Provider selected via IMAGE_GEN_PROVIDER env var.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Configuration ──────────────────────────────────────────────

type Provider = 'replicate' | 'openai' | 'stability'

function getProvider(): Provider {
  return (Deno.env.get('IMAGE_GEN_PROVIDER') as Provider) || 'replicate'
}

function getApiKey(provider: Provider): string {
  switch (provider) {
    case 'replicate': return Deno.env.get('REPLICATE_API_KEY') || ''
    case 'openai': return Deno.env.get('OPENAI_API_KEY') || ''
    case 'stability': return Deno.env.get('STABILITY_API_KEY') || ''
  }
}

// ── Prompt builder ─────────────────────────────────────────────

function buildVisualPrompt(section: { description: string; style?: string; tone?: string }): string {
  const parts = [section.description || 'Professional social media visual']
  if (section.style) parts.push(section.style)
  parts.push('high quality, professional, safe for social media, no text overlays, clean composition')
  if (section.tone) parts.push(section.tone)
  return parts.join(', ')
}

// ── Replicate (Flux Schnell) ───────────────────────────────────

async function generateWithReplicate(
  prompt: string,
  apiKey: string,
  width: number,
  height: number
): Promise<string> {
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      version: 'black-forest-labs/flux-schnell',
      input: {
        prompt,
        negative_prompt: 'blurry, low quality, distorted, watermark, text, logo, nsfw',
        width,
        height,
        num_outputs: 1,
        num_inference_steps: 4,
      },
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`Replicate error: ${err.detail || response.status}`)
  }

  const prediction = await response.json() as { id: string }
  const imageUrl = await pollReplicate(prediction.id, apiKey)
  return imageUrl
}

async function pollReplicate(predictionId: string, apiKey: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    const p = await response.json() as {
      status: string
      output?: string[]
      error?: string
    }

    if (p.status === 'succeeded' && p.output?.length) return p.output[0]
    if (p.status === 'failed') throw new Error(p.error || 'Replicate generation failed')
    if (p.status === 'canceled') throw new Error('Replicate generation canceled')

    await new Promise(r => setTimeout(r, 1000))
  }
  throw new Error('Replicate generation timed out (30s)')
}

// ── OpenAI DALL-E 3 ────────────────────────────────────────────

async function generateWithOpenAI(
  prompt: string,
  apiKey: string,
  width: number,
  height: number
): Promise<string> {
  const size = width === height ? '1024x1024' : width > height ? '1792x1024' : '1024x1792'

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size,
      quality: 'hd',
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`OpenAI error: ${err.error?.message || response.status}`)
  }

  const result = await response.json() as { data: Array<{ url: string }> }
  return result.data[0].url
}

// ── Stability AI ───────────────────────────────────────────────

async function generateWithStability(
  prompt: string,
  apiKey: string,
  _width: number,
  _height: number
): Promise<{ imageBytes: Uint8Array; mimeType: string }> {
  const formData = new FormData()
  formData.append('prompt', prompt)
  formData.append('negative_prompt', 'blurry, low quality, watermark, text')
  formData.append('aspect_ratio', '9:16')
  formData.append('output_format', 'png')

  const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/sd3', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData,
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`Stability error: ${err.message || response.status}`)
  }

  // Stability returns raw image bytes — return them for direct upload to storage
  const imageBytes = new Uint8Array(await response.arrayBuffer())
  return { imageBytes, mimeType: 'image/png' }
}

// ── Image upload to Supabase storage ───────────────────────────

/** Upload a remote image URL to Supabase storage */
async function uploadUrlToStorage(
  supabase: ReturnType<typeof createClient>,
  imageUrl: string,
  userId: string,
  index: number
): Promise<string> {
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`)

  const blob = await res.blob()
  return uploadBlobToStorage(supabase, blob, userId, index)
}

/** Upload raw image bytes to Supabase storage */
async function uploadBytesToStorage(
  supabase: ReturnType<typeof createClient>,
  imageBytes: Uint8Array,
  mimeType: string,
  userId: string,
  index: number
): Promise<string> {
  const blob = new Blob([imageBytes], { type: mimeType })
  return uploadBlobToStorage(supabase, blob, userId, index)
}

async function uploadBlobToStorage(
  supabase: ReturnType<typeof createClient>,
  blob: Blob,
  userId: string,
  index: number
): Promise<string> {
  const fileExt = blob.type === 'image/png' ? 'png' : 'jpg'
  const filePath = `${userId}/ai-generated/${Date.now()}_${index}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('assets')
    .upload(filePath, blob, {
      contentType: blob.type,
      upsert: true,
    })

  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage
    .from('assets')
    .getPublicUrl(filePath)

  return urlData.publicUrl
}

// ── Main handler ───────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { jobId, sections } = await req.json() as {
      jobId: string
      sections: Array<{
        description: string
        style?: string
        tone?: string
        aspectRatio?: string
      }>
    }

    if (!jobId || !sections?.length) {
      return new Response(
        JSON.stringify({ error: 'jobId and sections array are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get the job to find the user
    const { data: job } = await supabase
      .from('content_jobs')
      .select('user_id')
      .eq('id', jobId)
      .single()

    if (!job) {
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const provider = getProvider()
    const apiKey = getApiKey(provider)
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: `API key for ${provider} not configured` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Generating ${sections.length} images using ${provider} for job ${jobId}`)

    const generatedImages: Array<{
      section_index: number
      prompt: string
      image_url: string
      storage_url: string
      provider: string
    }> = []

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i]
      const prompt = buildVisualPrompt(section)

      // Determine dimensions based on aspect ratio
      const aspectRatio = section.aspectRatio || '9:16'
      const dims: Record<string, { w: number; h: number }> = {
        '1:1': { w: 1024, h: 1024 },
        '9:16': { w: 1080, h: 1920 },
        '16:9': { w: 1920, h: 1080 },
        '2:3': { w: 1000, h: 1500 },
        '4:5': { w: 1080, h: 1350 },
      }
      const { w, h } = dims[aspectRatio] || { w: 1080, h: 1920 }

      let imageUrl: string
      let storageUrl: string

      switch (provider) {
        case 'replicate':
          imageUrl = await generateWithReplicate(prompt, apiKey, w, h)
          storageUrl = await uploadUrlToStorage(supabase, imageUrl, job.user_id, i)
          break
        case 'openai':
          imageUrl = await generateWithOpenAI(prompt, apiKey, w, h)
          storageUrl = await uploadUrlToStorage(supabase, imageUrl, job.user_id, i)
          break
        case 'stability': {
          const { imageBytes, mimeType } = await generateWithStability(prompt, apiKey, w, h)
          storageUrl = await uploadBytesToStorage(supabase, imageBytes, mimeType, job.user_id, i)
          imageUrl = storageUrl // Stability returns bytes, so the URL is the storage URL
          break
        }
        default:
          throw new Error(`Unknown provider: ${provider}`)
      }

      generatedImages.push({
        section_index: i,
        prompt,
        image_url: imageUrl,
        storage_url: storageUrl,
        provider,
      })

      // Save as user asset (all providers now produce persistable images)
      await supabase.from('user_assets').insert({
        user_id: job.user_id,
        file_url: storageUrl,
        file_type: 'image',
        name: `AI Generated - Section ${i + 1}`,
        tags: ['ai-generated', provider, aspectRatio],
        size_bytes: 0,
      })

      // Rate limit: small delay between generations
      if (i < sections.length - 1) {
        await new Promise(r => setTimeout(r, 500))
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        provider,
        images: generatedImages,
        count: generatedImages.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('generate-images error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
