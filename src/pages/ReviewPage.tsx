import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Check, ChevronLeft, RefreshCw, Calendar, Play, Edit3, Loader2 } from 'lucide-react'
import { supabase, db } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { track, Events } from '@/lib/monitoring'
import { PLATFORM_MAP } from '@/constants/platforms'
import type { ContentJob, ContentPiece } from '@/types/database'

function PhoneFrame({ piece, isSelected, onClick }: { piece: ContentPiece; isSelected: boolean; onClick: () => void }) {
  const platform = PLATFORM_MAP[piece.platform]
  const isVertical = ['tiktok', 'instagram', 'snapchat', 'pinterest'].includes(piece.platform)

  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {/* Phone frame */}
      <div style={{
        width: isVertical ? 140 : 200,
        height: isVertical ? 240 : 140,
        background: '#161C24',
        borderRadius: 20,
        border: `2px solid ${isSelected ? '#00E5A0' : '#1E2A36'}`,
        overflow: 'hidden',
        position: 'relative',
        transition: 'border-color 0.2s',
        boxShadow: isSelected ? '0 0 20px rgba(0,229,160,0.15)' : 'none',
      }}>
        {/* Notch */}
        <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', width: 40, height: 4, background: '#1E2A36', borderRadius: 2, zIndex: 10 }} />

        {/* Content */}
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F1318' }}>
          {piece.video_url ? (
            <video src={piece.video_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>{platform?.icon}</div>
              <div style={{ fontSize: 9, color: '#4A5E70', fontFamily: 'JetBrains Mono' }}>PREVIEW</div>
            </div>
          )}
        </div>

        {/* Play button overlay */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Play size={14} color="#fff" style={{ marginLeft: 2 }} />
          </div>
        </div>
      </div>

      {/* Platform label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 14 }}>{platform?.icon}</span>
        <span style={{ fontSize: 11, color: isSelected ? '#00E5A0' : '#8B9EB0', fontFamily: 'Syne', fontWeight: 600 }}>
          {platform?.name}
        </span>
      </div>
    </button>
  )
}

export function ReviewPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [job, setJob] = useState<ContentJob | null>(null)
  const [pieces, setPieces] = useState<ContentPiece[]>([])
  const [selectedPiece, setSelectedPiece] = useState<ContentPiece | null>(null)
  const [editingCaption, setEditingCaption] = useState(false)
  const [caption, setCaption] = useState('')
  const [approved, setApproved] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [scheduling, setScheduling] = useState(false)

  useEffect(() => {
    if (!jobId || !user) return
    async function load() {
      const [jobRes, piecesRes] = await Promise.all([
        db.from('content_jobs').select('*').eq('id', jobId).eq('user_id', user!.id).single(),
        db.from('content_pieces').select('*').eq('job_id', jobId).eq('user_id', user!.id),
      ])
      setJob(jobRes.data)
      const pieces = piecesRes.data || []
      setPieces(pieces)
      if (pieces.length > 0) {
        setSelectedPiece(pieces[0])
        setCaption(pieces[0].caption || '')
      }
      setLoading(false)
    }
    load()

    // Real-time subscription for job updates
    const sub = supabase.channel('job-' + jobId)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'content_jobs', filter: `id=eq.${jobId}` }, (payload) => {
        setJob(payload.new as ContentJob)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'content_pieces', filter: `job_id=eq.${jobId}` }, (payload) => {
        setPieces(prev => {
          const updated = [...prev.filter(p => p.id !== payload.new.id), payload.new as ContentPiece]
          if (prev.length === 0) { setSelectedPiece(payload.new as ContentPiece); setCaption((payload.new as ContentPiece).caption || '') }
          return updated
        })
      })
      .subscribe()

    return () => { sub.unsubscribe() }
  }, [jobId, user])

  async function saveCaption() {
    if (!selectedPiece) return
    await db.from('content_pieces').update({ caption }).eq('id', selectedPiece.id)
    setPieces(prev => prev.map(p => p.id === selectedPiece.id ? { ...p, caption } : p))
    setSelectedPiece(prev => prev ? { ...prev, caption } : null)
    setEditingCaption(false)
  }

  function approveAll() {
    const ids = new Set(pieces.map(p => p.id))
    setApproved(ids)
    pieces.forEach(p => db.from('content_pieces').update({ status: 'approved' }).eq('id', p.id))
  }

  async function scheduleAll() {
    setScheduling(true)
    const approvedPieces = pieces.filter(p => approved.has(p.id))
    if (approvedPieces.length === 0) {
      setScheduling(false)
      return
    }
    // Stagger across the next 24h, every 30min, starting at the next 15-min mark.
    const first = new Date()
    first.setMinutes(Math.ceil(first.getMinutes() / 15) * 15, 0, 0)
    const rows = approvedPieces.map((piece, i) => ({
      content_piece_id: piece.id,
      user_id: user!.id,
      platform: piece.platform,
      scheduled_for: new Date(first.getTime() + i * 30 * 60 * 1000).toISOString(),
      status: 'scheduled' as const,
    }))
    await db.from('scheduled_posts').insert(rows)

    track(Events.SCHEDULE_POST, {
      post_count: approvedPieces.length,
      platforms: [...new Set(approvedPieces.map(p => p.platform))],
    })

    setScheduling(false)
    navigate('/schedule')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Loader2 size={24} color="#00E5A0" className="animate-spin" />
      </div>
    )
  }

  if (job?.status === 'processing' || job?.status === 'pending') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
        <Loader2 size={32} color="#00E5A0" className="animate-spin" />
        <h2 style={{ fontFamily: 'Syne', fontSize: 20, color: '#F0F4F8' }}>Content is being generated…</h2>
        <p style={{ color: '#8B9EB0', fontSize: 14 }}>
          {job.pipeline_stage || 'Processing'} · {job.pipeline_progress || 0}% complete
        </p>
        <div className="progress-bar" style={{ width: 300 }}>
          <div className="progress-bar-fill" style={{ width: `${job.pipeline_progress || 10}%`, transition: 'width 1s ease' }} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #1E2A36', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <button onClick={() => navigate('/dashboard')} className="btn-ghost">
          <ChevronLeft size={16} /> Back
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 700, color: '#F0F4F8', margin: 0 }}>Review & Approve</h1>
          <p style={{ color: '#8B9EB0', fontSize: 12, margin: 0 }}>{job?.prompt?.slice(0, 80)}…</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={approveAll} className="btn-secondary" style={{ fontSize: 13, gap: 6 }}>
            <Check size={14} /> Approve All
          </button>
          <button
            onClick={scheduleAll}
            disabled={approved.size === 0 || scheduling}
            className="btn-primary"
            style={{ fontSize: 13, gap: 6 }}
          >
            {scheduling ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
            Schedule {approved.size > 0 ? `(${approved.size})` : 'Posts'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Platform previews sidebar */}
        <div style={{ width: 280, borderRight: '1px solid #1E2A36', padding: '20px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 11, color: '#4A5E70', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {pieces.length} versions generated
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pieces.map(piece => (
              <div key={piece.id} style={{ position: 'relative' }}>
                <PhoneFrame
                  piece={piece}
                  isSelected={selectedPiece?.id === piece.id}
                  onClick={() => { setSelectedPiece(piece); setCaption(piece.caption || ''); setEditingCaption(false) }}
                />
                {approved.has(piece.id) && (
                  <div style={{ position: 'absolute', top: 8, right: 8, background: '#00E5A0', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={10} color="#080B0F" />
                  </div>
                )}
              </div>
            ))}
            {pieces.length === 0 && (
              <div style={{ textAlign: 'center', color: '#4A5E70', fontSize: 13, padding: 20 }}>
                Content being generated…
              </div>
            )}
          </div>
        </div>

        {/* Main review panel */}
        {selectedPiece ? (
          <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
            <div style={{ display: 'flex', gap: 20 }}>
              {/* Left: preview */}
              <div style={{ flex: '0 0 auto' }}>
                <div style={{
                  width: ['tiktok','instagram','snapchat'].includes(selectedPiece.platform) ? 220 : 320,
                  height: ['tiktok','instagram','snapchat'].includes(selectedPiece.platform) ? 380 : 200,
                  background: '#161C24',
                  borderRadius: 24,
                  border: '2px solid #1E2A36',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}>
                  {selectedPiece.video_url ? (
                    <video controls src={selectedPiece.video_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 48, marginBottom: 8 }}>{PLATFORM_MAP[selectedPiece.platform]?.icon}</div>
                      <div style={{ fontSize: 12, color: '#4A5E70' }}>Preview generating…</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <span style={{ fontSize: 22 }}>{PLATFORM_MAP[selectedPiece.platform]?.icon}</span>
                  <h2 style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 700, color: '#F0F4F8', margin: 0 }}>
                    {PLATFORM_MAP[selectedPiece.platform]?.name}
                  </h2>
                  <span style={{ flex: 1 }} />
                  <button
                    onClick={() => {
                      setApproved(prev => {
                        const next = new Set(prev)
                        if (next.has(selectedPiece.id)) next.delete(selectedPiece.id)
                        else next.add(selectedPiece.id)
                        return next
                      })
                      if (!approved.has(selectedPiece.id)) {
                        db.from('content_pieces').update({ status: 'approved' }).eq('id', selectedPiece.id)
                      }
                    }}
                    className={approved.has(selectedPiece.id) ? 'btn-secondary' : 'btn-primary'}
                    style={{ fontSize: 13 }}
                  >
                    {approved.has(selectedPiece.id) ? <><Check size={14} /> Approved</> : 'Approve'}
                  </button>
                </div>

                {/* Caption */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ fontSize: 12, color: '#8B9EB0', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Caption</label>
                    <button onClick={() => setEditingCaption(!editingCaption)} className="btn-ghost" style={{ fontSize: 12 }}>
                      <Edit3 size={12} /> {editingCaption ? 'Cancel' : 'Edit'}
                    </button>
                  </div>
                  {editingCaption ? (
                    <div>
                      <textarea
                        className="input-base"
                        value={caption}
                        onChange={e => setCaption(e.target.value)}
                        style={{ minHeight: 120, resize: 'vertical', lineHeight: 1.6 }}
                      />
                      <button onClick={saveCaption} className="btn-primary" style={{ marginTop: 8, fontSize: 13 }}>
                        Save caption
                      </button>
                    </div>
                  ) : (
                    <div style={{ background: '#161C24', border: '1px solid #1E2A36', borderRadius: 8, padding: 14, fontSize: 14, color: '#F0F4F8', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                      {selectedPiece.caption || <span style={{ color: '#4A5E70' }}>No caption generated</span>}
                    </div>
                  )}
                </div>

                {/* Hashtags */}
                {selectedPiece.hashtags?.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, color: '#8B9EB0', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Hashtags</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {selectedPiece.hashtags.map(tag => (
                        <span key={tag} style={{ padding: '3px 10px', background: 'rgba(0,229,160,0.08)', border: '1px solid rgba(0,229,160,0.15)', borderRadius: 20, fontSize: 12, color: '#00E5A0' }}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick regenerate actions */}
                <div>
                  <div style={{ fontSize: 12, color: '#8B9EB0', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Quick edits</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {['Make hook punchier', 'Change music', 'Trim to 30s', 'Add CTA', 'Retone for professional'].map(action => (
                      <button
                        key={action}
                        className="btn-secondary"
                        style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <RefreshCw size={10} /> {action}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A5E70' }}>
            Select a version to review
          </div>
        )}
      </div>
    </div>
  )
}
