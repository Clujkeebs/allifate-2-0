import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Upload, Search, Monitor, ChevronDown, ChevronUp, Loader2, X } from 'lucide-react'
import { supabase, db } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PLATFORMS, TONES } from '@/constants/platforms'
import { track, Events } from '@/lib/monitoring'
import type { ContentJob, Platform } from '@/types/database'

const PIPELINE_STAGES = [
  { key: 'strategy', label: 'Content Strategy AI', icon: '🧠', desc: 'Analyzing your niche and crafting platform-specific briefs' },
  { key: 'assets', label: 'Asset Sourcing', icon: '🎬', desc: 'Finding licensed visuals that match your content brief' },
  { key: 'script', label: 'Script & Voiceover', icon: '🎙️', desc: 'Writing hook, body, CTA and generating voiceover' },
  { key: 'assembly', label: 'Video Assembly', icon: '⚡', desc: 'Rendering with animated captions and platform-safe zones' },
  { key: 'adapt', label: 'Platform Adaptation', icon: '📱', desc: 'Exporting 8 native versions simultaneously' },
]

const SOURCE_MODES = [
  { id: 'upload', icon: <Upload size={16} />, label: 'Upload', desc: 'Your own footage, photos, or screen recordings' },
  { id: 'stock', icon: <Search size={16} />, label: 'Licensed Stock', desc: 'Pexels, Pixabay, Unsplash — commercial-use licensed' },
  { id: 'screen', icon: <Monitor size={16} />, label: 'Screen Mode', desc: 'Tutorial mode with AI narration and callouts' },
]

export function CreatePage() {
  const { user, subscription } = useAuth()
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['tiktok', 'instagram'])
  const [sourceMode, setSourceMode] = useState<'upload' | 'stock' | 'screen'>('stock')
  const [tone, setTone] = useState('casual')
  const [musicMood, setMusicMood] = useState('upbeat')
  const [videoLength, setVideoLength] = useState(60)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [pipelineStage, setPipelineStage] = useState(-1)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [activeJobStatus, setActiveJobStatus] = useState<ContentJob['status'] | null>(null)
  const [error, setError] = useState<string | null>(null)

  function togglePlatform(id: Platform) {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const canGenerate = prompt.trim().length > 10 && selectedPlatforms.length > 0 && !generating

  async function handleGenerate() {
    if (!canGenerate || !user) return
    if (subscription && subscription.posts_used_this_month >= subscription.posts_limit && subscription.posts_limit !== -1) {
      setError('You have reached your monthly post limit. Please upgrade your plan.')
      return
    }
    setError(null)
    setGenerating(true)
    setPipelineStage(0)

    // Create the job record
    const { data: job, error: jobErr } = await db.from('content_jobs').insert({
      user_id: user.id,
      prompt: prompt.trim(),
      status: 'pending',
      platforms: selectedPlatforms,
      source_mode: sourceMode,
      tone,
      music_mood: musicMood,
      video_length: videoLength,
      pipeline_stage: 'Initializing',
      pipeline_progress: 0,
    }).select().single()

    if (jobErr || !job) {
      setError('Failed to create job. Please try again.')
      setGenerating(false)
      return
    }

    setActiveJobId(job.id)
    setActiveJobStatus(job.status)
    setPipelineStage(0)

    track(Events.GENERATE_CONTENT, {
      platforms: selectedPlatforms,
      source_mode: sourceMode,
      tone,
      platform_count: selectedPlatforms.length,
    })

    // Fire the generate request in the background — the UI follows the real
    // job state via the realtime subscription below, not a fake timer.
    void (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token ?? ''}`,
          },
          body: JSON.stringify({
            jobId: job.id,
            prompt: prompt.trim(),
            platforms: selectedPlatforms,
            sourceMode,
            tone,
            musicMood,
            videoLength,
          }),
        })
        if (!res.ok) {
          const body = await res.text()
          console.error('generate failed:', body)
        }
      } catch (err) {
        console.error('generate request error:', err)
      }
    })()
  }

  // Translate the job's pipeline_progress (0..100) into the visible stage.
  useEffect(() => {
    if (!activeJobId) return
    const channel = supabase.channel('create-job-' + activeJobId)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'content_jobs', filter: `id=eq.${activeJobId}` }, (payload) => {
        const next = payload.new as ContentJob
        setActiveJobStatus(next.status)
        const pct = next.pipeline_progress || 0
        // 0–10 strategy, 10–35 assets, 35–55 script, 55–75 assembly, 75–100 adapt
        let idx = 0
        if (pct >= 100) idx = PIPELINE_STAGES.length
        else if (pct >= 75) idx = 4
        else if (pct >= 55) idx = 3
        else if (pct >= 35) idx = 2
        else if (pct >= 10) idx = 1
        setPipelineStage(idx)
        if (next.status === 'review' || pct >= 100) {
          setTimeout(() => navigate(`/review/${activeJobId}`), 600)
        }
        if (next.status === 'failed') {
          setError(next.error_message || 'Generation failed. Please try again.')
          setGenerating(false)
          setActiveJobId(null)
        }
      })
      .subscribe()
    return () => { channel.unsubscribe() }
  }, [activeJobId, navigate])

  // If the API takes too long without producing any progress, send the user to the
  // review page anyway — they can watch progress there via the same realtime sub.
  useEffect(() => {
    if (!activeJobId || pipelineStage > 0) return
    const t = setTimeout(() => {
      if (activeJobStatus !== 'failed') navigate(`/review/${activeJobId}`)
    }, 12000)
    return () => clearTimeout(t)
  }, [activeJobId, pipelineStage, activeJobStatus, navigate])

  if (generating) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 560, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 20, animation: pipelineStage >= PIPELINE_STAGES.length ? 'celebrate-bounce 0.6s ease' : 'none' }}>
            {pipelineStage >= 0 && pipelineStage < PIPELINE_STAGES.length ? PIPELINE_STAGES[pipelineStage].icon : '🎉'}
          </div>
          <h2 style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 700, color: '#F0F4F8', marginBottom: 8 }}>
            {pipelineStage >= PIPELINE_STAGES.length ? '✨ Content ready for review!' : 'Creating your content…'}
          </h2>
          <p style={{ color: '#8B9EB0', fontSize: 14, marginBottom: 32 }}>
            {pipelineStage >= PIPELINE_STAGES.length ? 'All 8 platform versions are ready. Review and approve them before posting.' : 'Loading your preview…'}
          </p>

          <div style={{ background: '#0F1318', border: '1px solid #1E2A36', borderRadius: 16, padding: 24, textAlign: 'left' }}>
            {PIPELINE_STAGES.map((stage, i) => (
              <div key={stage.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < PIPELINE_STAGES.length - 1 ? '1px solid #1E2A36' : 'none' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: i < pipelineStage ? '#00E5A0' : i === pipelineStage ? 'rgba(0,229,160,0.15)' : '#1E2A36',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: i < pipelineStage ? 14 : 18, flexShrink: 0,
                  transition: 'all 0.4s',
                }}>
                  {i < pipelineStage ? '✓' : stage.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontFamily: 'Syne', fontWeight: 600, color: i <= pipelineStage ? '#F0F4F8' : '#4A5E70' }}>
                    {stage.label}
                  </div>
                  {i === pipelineStage && (
                    <div style={{ fontSize: 11, color: '#8B9EB0', marginTop: 2 }}>{stage.desc}</div>
                  )}
                </div>
                {i === pipelineStage && (
                  <Loader2 size={14} color="#00E5A0" className="animate-spin" />
                )}
                {i < pipelineStage && (
                  <div style={{ fontSize: 11, color: '#00E5A0', fontFamily: 'JetBrains Mono' }}>DONE</div>
                )}
              </div>
            ))}
          </div>

          <div className="progress-bar" style={{ marginTop: 20 }}>
            <div className="progress-bar-fill" style={{ width: `${Math.round(((pipelineStage + 1) / PIPELINE_STAGES.length) * 100)}%`, transition: 'width 1s ease' }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 28 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 700, color: '#F0F4F8', marginBottom: 6 }}>Create Content</h1>
        <p style={{ color: '#8B9EB0', fontSize: 14 }}>Describe what you want — Virlo handles the rest.</p>
      </div>

      {/* Prompt textarea */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 12, color: '#8B9EB0', display: 'block', marginBottom: 8, fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Your prompt
        </label>
        <textarea
          className="input-base"
          placeholder="Describe what you want to create…&#10;&#10;e.g. &quot;3 productivity hacks for remote workers that actually work, keep it under 60 seconds and make it punchy&quot;"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          style={{ minHeight: 140, resize: 'vertical', fontSize: 16, lineHeight: 1.6 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 11, color: '#4A5E70' }}>Be specific — the more context you give, the better the output</span>
          <span style={{ fontSize: 11, color: prompt.length > 500 ? '#FF4757' : '#4A5E70', fontFamily: 'JetBrains Mono' }}>
            {prompt.length}/500
          </span>
        </div>
      </div>

      {/* Platform selector */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 12, color: '#8B9EB0', display: 'block', marginBottom: 8, fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Publish to ({selectedPlatforms.length} selected)
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PLATFORMS.map(p => {
            const selected = selectedPlatforms.includes(p.id)
            return (
              <button
                key={p.id}
                onClick={() => togglePlatform(p.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 20,
                  background: selected ? p.bgColor : '#161C24',
                  border: `1px solid ${selected ? p.color : '#1E2A36'}`,
                  color: selected ? '#F0F4F8' : '#8B9EB0',
                  cursor: 'pointer', fontSize: 13,
                  transition: 'all 0.2s',
                  fontFamily: 'DM Sans',
                }}
              >
                <span style={{ fontSize: 16 }}>{p.icon}</span>
                {p.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Source mode */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 12, color: '#8B9EB0', display: 'block', marginBottom: 8, fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Media source
        </label>
        <div className="source-mode-grid" style={{ display: 'flex', gap: 10 }}>
          {SOURCE_MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setSourceMode(m.id as typeof sourceMode)}
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 10, textAlign: 'left',
                background: sourceMode === m.id ? 'rgba(0,229,160,0.06)' : '#161C24',
                border: `1px solid ${sourceMode === m.id ? '#00E5A0' : '#1E2A36'}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color: sourceMode === m.id ? '#00E5A0' : '#8B9EB0' }}>
                {m.icon}
                <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'Syne', color: sourceMode === m.id ? '#00E5A0' : '#F0F4F8' }}>{m.label}</span>
              </div>
              <div style={{ fontSize: 11, color: '#8B9EB0', lineHeight: 1.4 }}>{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced options */}
      <div style={{ marginBottom: 28 }}>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#8B9EB0', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: showAdvanced ? 16 : 0 }}
        >
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Advanced options
        </button>

        {showAdvanced && (
          <div className="animate-slide-up advanced-options-grid" style={{ background: '#0F1318', border: '1px solid #1E2A36', borderRadius: 12, padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: '#8B9EB0', display: 'block', marginBottom: 8 }}>Tone override</label>
              <select className="input-base" value={tone} onChange={e => setTone(e.target.value)}>
                {TONES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#8B9EB0', display: 'block', marginBottom: 8 }}>Music mood</label>
              <select className="input-base" value={musicMood} onChange={e => setMusicMood(e.target.value)}>
                {['upbeat', 'calm', 'dramatic', 'inspirational', 'corporate', 'none'].map(m => (
                  <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#8B9EB0', display: 'block', marginBottom: 8 }}>Target length (seconds)</label>
              <input className="input-base" type="number" min={15} max={600} value={videoLength} onChange={e => setVideoLength(Number(e.target.value))} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#8B9EB0', display: 'block', marginBottom: 8 }}>Caption style</label>
              <select className="input-base">
                {['word-by-word', 'full-sentence', 'none'].map(s => (
                  <option key={s} value={s}>{s.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#FF4757', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <X size={14} />
          {error}
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={!canGenerate}
        className="btn-primary"
        style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 16, borderRadius: 12 }}
      >              <Sparkles size={18} />
              Generate Content for {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''}
            </button>

      <p style={{ textAlign: 'center', fontSize: 12, color: '#4A5E70', marginTop: 12 }}>
        Uses 1 credit · Ready for review in ~3 minutes · Human approval required before posting
      </p>
    </div>
  )
}
