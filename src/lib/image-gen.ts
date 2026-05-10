/**
 * AI Image Generation — Multi-Provider Abstraction
 *
 * Supports:
 * - Replicate (Flux Pro/Schnell, SDXL) — best quality, fast
 * - OpenAI DALL-E 3 — simple, good for illustrations
 * - Stability AI (SD3, SDXL) — flexible, open models
 *
 * Configure via env vars:
 *   VITE_IMAGE_GEN_PROVIDER=replicate|openai|stability
 *   REPLICATE_API_KEY=...
 *   OPENAI_API_KEY=...
 *   STABILITY_API_KEY=...
 *
 * For faceless YouTube / AI-generated content channels, this generates
 * visuals to accompany each section of the AI-written script.
 */

// ── Types ──────────────────────────────────────────────────────

export type ImageGenProvider = 'replicate' | 'openai' | 'stability'

export interface ImageGenOptions {
  prompt: string
  /** Negative prompt (things to avoid) */
  negativePrompt?: string
  /** Image width in pixels */
  width?: number
  /** Image height in pixels */
  height?: number
  /** Number of images to generate */
  count?: number
  /** Style preset (provider-specific) */
  style?: 'photorealistic' | 'illustration' | 'cinematic' | 'anime' | '3d-render' | 'flat-design'
  /** Aspect ratio shortcut (overrides width/height) */
  aspectRatio?: '1:1' | '9:16' | '16:9' | '2:3' | '3:2' | '4:5'
}

export interface GeneratedImage {
  /** Public URL of the generated image */
  url: string
  /** Provider that generated this image */
  provider: ImageGenProvider
  /** Width in pixels */
  width: number
  /** Height in pixels */
  height: number
  /** Generation metadata */
  metadata?: Record<string, unknown>
}

// ── Style prompts (prepended to user prompt for quality) ──────

const STYLE_PRESETS: Record<string, string> = {
  photorealistic: 'photorealistic, 8k, highly detailed, professional lighting, sharp focus, canon r5, editorial photography',
  illustration: 'digital illustration, clean lines, vibrant colors, professional artwork, trending on artstation',
  cinematic: 'cinematic lighting, film grain, anamorphic lens, depth of field, movie still, 35mm',
  anime: 'anime style, studio ghibli inspired, clean linework, vibrant cel shading, Japanese animation quality',
  '3d-render': '3d render, octane render, unreal engine 5, highly detailed, ray tracing, product photography',
  'flat-design': 'flat vector design, minimalist, clean shapes, bold colors, modern UI illustration, dribbble style',
}

const ASPECT_RATIOS: Record<string, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '9:16': { width: 1080, height: 1920 },
  '16:9': { width: 1920, height: 1080 },
  '2:3': { width: 1000, height: 1500 },
  '3:2': { width: 1500, height: 1000 },
  '4:5': { width: 1080, height: 1350 },
}

// ── Configuration ──────────────────────────────────────────────

function getProvider(): ImageGenProvider {
  return (import.meta.env.VITE_IMAGE_GEN_PROVIDER as ImageGenProvider) || 'replicate'
}

function getApiKey(): string {
  const provider = getProvider()
  switch (provider) {
    case 'replicate': return import.meta.env.VITE_REPLICATE_API_KEY || ''
    case 'openai': return import.meta.env.VITE_OPENAI_API_KEY || ''
    case 'stability': return import.meta.env.VITE_STABILITY_API_KEY || ''
    default: return ''
  }
}

export function isImageGenConfigured(): boolean {
  return Boolean(getApiKey())
}

// ── Prompt builder ─────────────────────────────────────────────

function buildPrompt(userPrompt: string, options: ImageGenOptions): string {
  const stylePrompt = options.style ? STYLE_PRESETS[options.style] || '' : STYLE_PRESETS.photorealistic
  const parts = [userPrompt]

  // For faceless content, add quality tags
  parts.push(stylePrompt)

  // Add safe-for-social-media guard
  parts.push('safe for social media, appropriate content, no offensive material')

  return parts.join(', ')
}

function getDimensions(options: ImageGenOptions): { width: number; height: number } {
  if (options.aspectRatio) {
    return ASPECT_RATIOS[options.aspectRatio] || { width: 1024, height: 1024 }
  }
  return {
    width: options.width || 1024,
    height: options.height || 1024,
  }
}

// ── Provider implementations ───────────────────────────────────

async function generateWithReplicate(options: ImageGenOptions): Promise<GeneratedImage[]> {
  const apiKey = import.meta.env.VITE_REPLICATE_API_KEY
  if (!apiKey) throw new Error('REPLICATE_API_KEY not configured')

  const prompt = buildPrompt(options.prompt, options)
  const { width, height } = getDimensions(options)
  const count = options.count || 1

  // Use Flux Schnell for speed (best for faceless content pipelines)
  const modelVersion = 'black-forest-labs/flux-schnell'
  const negativePrompt = options.negativePrompt || 'blurry, low quality, distorted, watermark, text, logo'

  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      version: modelVersion,
      input: {
        prompt,
        negative_prompt: negativePrompt,
        width,
        height,
        num_outputs: count,
        num_inference_steps: 4, // Schnell is fast (4 steps)
      },
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || `Replicate API error: ${response.status}`)
  }

  const prediction = await response.json() as {
    id: string
    status: string
    output?: string[]
    error?: string
  }

  // Poll for completion (Replicate is async)
  const result = await pollReplicatePrediction(prediction.id, apiKey)
  if (result.error) throw new Error(result.error)

  return (result.output || []).map((url: string) => ({
    url,
    provider: 'replicate' as const,
    width,
    height,
    metadata: { model: modelVersion, predictionId: prediction.id },
  }))
}

async function pollReplicatePrediction(
  predictionId: string,
  apiKey: string,
  maxAttempts = 30,
  delayMs = 1000
): Promise<{ output?: string[]; error?: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    const prediction = await response.json() as {
      status: string
      output?: string[]
      error?: string
    }

    if (prediction.status === 'succeeded') return { output: prediction.output }
    if (prediction.status === 'failed') return { error: prediction.error || 'Generation failed' }
    if (prediction.status === 'canceled') return { error: 'Generation canceled' }

    await new Promise(r => setTimeout(r, delayMs))
  }
  return { error: 'Generation timed out' }
}

async function generateWithOpenAI(options: ImageGenOptions): Promise<GeneratedImage[]> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured')

  const prompt = buildPrompt(options.prompt, options)
  const { width, height } = getDimensions(options)
  const count = Math.min(options.count || 1, 1) // DALL-E generates 1 at a time

  // Map style to DALL-E quality
  const size = width >= height ? `${width}x${height}` : `${height}x${width}`
  const dallESize = width === height ? '1024x1024' : width > height ? '1792x1024' : '1024x1792'

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: count,
      size: dallESize,
      quality: 'hd',
      style: options.style === 'illustration' ? 'vivid' : 'natural',
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `OpenAI API error: ${response.status}`)
  }

  const result = await response.json() as {
    data: Array<{ url: string; revised_prompt?: string }>
  }

  return result.data.map(img => ({
    url: img.url,
    provider: 'openai' as const,
    width: dallESize === '1024x1024' ? 1024 : dallESize === '1792x1024' ? 1792 : 1024,
    height: dallESize === '1024x1024' ? 1024 : dallESize === '1792x1024' ? 1024 : 1792,
    metadata: { revised_prompt: img.revised_prompt },
  }))
}

async function generateWithStability(options: ImageGenOptions): Promise<GeneratedImage[]> {
  const apiKey = import.meta.env.VITE_STABILITY_API_KEY
  if (!apiKey) throw new Error('STABILITY_API_KEY not configured')

  const prompt = buildPrompt(options.prompt, options)
  const { width, height } = getDimensions(options)
  const negativePrompt = options.negativePrompt || 'blurry, low quality, watermark'

  const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/sd3', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt,
      negative_prompt: negativePrompt,
      aspect_ratio: options.aspectRatio || '1:1',
      output_format: 'png',
      model: 'sd3.5-large',
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.message || `Stability API error: ${response.status}`)
  }

  // Stability returns image bytes directly
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)

  return [{
    url,
    provider: 'stability' as const,
    width,
    height,
    metadata: { model: 'sd3.5-large' },
  }]
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Generate AI images. Automatically selects the configured provider.
 */
export async function generateImages(options: ImageGenOptions): Promise<GeneratedImage[]> {
  if (!isImageGenConfigured()) {
    throw new Error(`AI image generation is not configured. Set VITE_IMAGE_GEN_PROVIDER and the corresponding API key.`)
  }

  const provider = getProvider()
  switch (provider) {
    case 'replicate': return generateWithReplicate(options)
    case 'openai': return generateWithOpenAI(options)
    case 'stability': return generateWithStability(options)
    default: throw new Error(`Unknown image generation provider: ${provider}`)
  }
}

/**
 * Generate images for multiple script sections (for faceless content pipelines).
 * Each section gets its own AI-generated visual.
 */
export async function generateImagesForSections(
  sections: Array<{ prompt: string; aspectRatio?: ImageGenOptions['aspectRatio'] }>,
  baseOptions: Omit<ImageGenOptions, 'prompt' | 'count' | 'aspectRatio'> = {}
): Promise<GeneratedImage[][]> {
  const results: GeneratedImage[][] = []

  for (const section of sections) {
    const images = await generateImages({
      ...baseOptions,
      prompt: section.prompt,
      aspectRatio: section.aspectRatio || '9:16',
      count: 1,
    })
    results.push(images)
  }

  return results
}

/**
 * Generate a faceless content thumbnail (optimized for YouTube/TikTok).
 */
export async function generateThumbnail(
  title: string,
  style: ImageGenOptions['style'] = 'cinematic'
): Promise<GeneratedImage> {
  const thumbnailPrompt = `Eye-catching YouTube thumbnail for: "${title}". Bold, clickable, high contrast, professional YouTuber style, vibrant colors, large readable text implied, dramatic lighting.`

  const images = await generateImages({
    prompt: thumbnailPrompt,
    style,
    aspectRatio: '16:9',
    count: 1,
    negativePrompt: 'blurry, low quality, cluttered, small text, boring',
  })

  return images[0]
}
