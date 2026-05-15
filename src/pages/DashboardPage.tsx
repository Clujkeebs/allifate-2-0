import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, TrendingUp, Eye, Heart, Share2, Clock, CheckCircle, AlertCircle, Loader2, Zap } from 'lucide-react'
import { db } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PLATFORM_MAP, PLATFORMS } from '@/constants/platforms'
import type { ContentJob, ContentPiece, PlatformConnection, PostAnalytics } from '@/types/database'

function StatCard({ label, value, change, icon }: { label: string; value: string; change?: string; icon: React.ReactNode }) {
  return (
    <div className="card card-hover" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 12, color: '#8B9EB0', fontFamily: 'JetBrains Mono' }}>{label}</span>
        <div style={{ color: '#8B9EB0' }}>{icon}</div>
      </div>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 28, fontWeight: 500, color: '#F0F4F8' }}>{value}</div>
      {change && <div style={{ fontSize: 12, color: '#00E5A0' }}>{change}</div>}
    </div>
  )
}

function JobStatusBadge({ status }: { status: ContentJob['status'] }) {
  const config = {
    pending: { color: '#FFB547', bg: 'rgba(255,181,71,0.1)', icon: <Clock size={10} /> },
    processing: { color: '#00B4D8', bg: 'rgba(0,180,216,0.1)', icon: <Loader2 size={10} className="animate-spin" /> },
    review: { color: '#00E5A0', bg: 'rgba(0,229,160,0.1)', icon: <Eye size={10} /> },
    scheduled: { color: '#8B9EB0', bg: 'rgba(139,158,176,0.1)', icon: <Clock size={10} /> },
    posted: { color: '#00C896', bg: 'rgba(0,200,150,0.1)', icon: <CheckCircle size={10} /> },
    failed: { color: '#FF4757', bg: 'rgba(255,71,87,0.1)', icon: <AlertCircle size={10} /> },
  }[status]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, background: config.bg, color: config.color, fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
      {config.icon} {status.toUpperCase()}
    </span>
  )
}

export function DashboardPage() {
  const { user, profile, subscription } = useAuth()
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<ContentJob[]>([])
  const [pieces, setPieces] = useState<ContentPiece[]>([])
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<PostAnalytics[]>([])

  useEffect(() => {
    if (!user) return
    async function load() {
      const [jobsRes, piecesRes, connRes, analyticsRes] = await Promise.all([
        db.from('content_jobs').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(10),
        db.from('content_pieces').select('*').eq('user_id', user!.id).order('posted_at', { ascending: false }).limit(12),
        db.from('platform_connections').select('*').eq('user_id', user!.id),
        // RLS filters by user via content_piece_id → content_pieces.user_id
        db.from('post_analytics').select('*').order('fetched_at', { ascending: false }),
      ])
      setJobs(jobsRes.data || [])
      setPieces(piecesRes.data || [])
      setConnections(connRes.data || [])
      setAnalytics(analyticsRes.data || [])
      setLoading(false)
    }
    load()
  }, [user])

  const postedThisMonth = pieces.filter(p => p.status === 'posted' && p.posted_at && new Date(p.posted_at) > new Date(new Date().setDate(1))).length
  const processingJobs = jobs.filter(j => j.status === 'processing' || j.status === 'pending')
  const totals = analytics.reduce((acc, a) => ({
    views: acc.views + a.views,
    likes: acc.likes + a.likes,
    shares: acc.shares + a.shares,
    saves: acc.saves + a.saves,
  }), { views: 0, likes: 0, shares: 0, saves: 0 })

  return (
    <div style={{ padding: 28, maxWidth: 1200, margin: '0 auto' }}>
      {/* Welcome header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 700, color: '#F0F4F8', marginBottom: 4 }}>
          {(() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; })()}{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}. 👋
        </h1>
        <p style={{ color: '#8B9EB0', fontSize: 14 }}>
          {processingJobs.length > 0 ? `${processingJobs.length} job${processingJobs.length > 1 ? 's' : ''} processing right now.` : "What do you want to create today?"}
        </p>
      </div>

      {/* Quick create CTA if no jobs */}
      {jobs.length === 0 && !loading && (
        <div style={{ background: 'linear-gradient(135deg, rgba(0,229,160,0.08), rgba(0,180,216,0.04))', border: '1px solid rgba(0,229,160,0.2)', borderRadius: 16, padding: 32, textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
          <h2 style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 700, color: '#F0F4F8', marginBottom: 8 }}>Create your first piece of content</h2>
          <p style={{ color: '#8B9EB0', fontSize: 14, marginBottom: 20 }}>Type a prompt and watch Virlo produce professional content for all your platforms.</p>
          <button onClick={() => navigate('/create')} className="btn-primary" style={{ fontSize: 14 }}>
            <Plus size={16} /> New Content
          </button>
        </div>
      )}

      {/* Stats row */}
      <div className="dashboard-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard label="POSTS THIS MONTH" value={String(postedThisMonth)} change={postedThisMonth > 0 ? '+' + postedThisMonth + ' this month' : undefined} icon={<TrendingUp size={16} />} />
        <StatCard label="TOTAL REACH" value={totals.views > 0 ? totals.views.toLocaleString() : '—'} icon={<Eye size={16} />} />
        <StatCard label="AVG ENGAGEMENT" value={totals.views > 0 ? ((totals.likes + totals.shares + totals.saves) / totals.views * 100).toFixed(1) + '%' : '—'} icon={<Heart size={16} />} />
        <StatCard label="CREDITS LEFT" value={String(subscription?.posts_limit === -1 ? '∞' : (subscription?.posts_limit || 0) - (subscription?.posts_used_this_month || 0))} icon={<Zap size={16} />} />
      </div>

      <div className="dashboard-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
        {/* Recent jobs + pieces */}
        <div>
          {/* Active jobs */}
          {processingJobs.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 600, color: '#8B9EB0', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E5A0', animation: 'pulse-glow 1.5s infinite' }} />
                ACTIVE JOBS
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {processingJobs.map(job => (
                  <div key={job.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: '#F0F4F8', marginBottom: 6, fontWeight: 500 }}>
                        {job.prompt.length > 70 ? job.prompt.slice(0, 70) + '…' : job.prompt}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <JobStatusBadge status={job.status} />
                        {job.pipeline_stage && <span style={{ fontSize: 11, color: '#8B9EB0' }}>{job.pipeline_stage}</span>}
                        <div style={{ display: 'flex', gap: 4 }}>
                          {job.platforms.map(p => (
                            <span key={p} style={{ fontSize: 14 }} title={PLATFORM_MAP[p]?.name}>{PLATFORM_MAP[p]?.icon}</span>
                          ))}
                        </div>
                      </div>
                      {job.status === 'processing' && (
                        <div className="progress-bar" style={{ marginTop: 8 }}>
                          <div className="progress-bar-fill" style={{ width: `${job.pipeline_progress || 20}%` }} />
                        </div>
                      )}
                    </div>
                    {job.status === 'review' && (
                      <button onClick={() => navigate(`/review/${job.id}`)} className="btn-primary" style={{ fontSize: 12, padding: '6px 14px', whiteSpace: 'nowrap' }}>
                        Review
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent content */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 600, color: '#8B9EB0' }}>RECENT CONTENT</h3>
              <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => navigate('/library')}>View all</button>
            </div>

            {loading ? (
              <div className="content-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[0,1,2,3,4,5].map(i => (
                  <div key={i} className="animate-shimmer" style={{ height: 180, borderRadius: 10 }} />
                ))}
              </div>
            ) : pieces.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 40, color: '#4A5E70' }}>
                <Share2 size={28} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <div style={{ fontSize: 14 }}>No content yet. Create your first post!</div>
              </div>
            ) : (
              <div className="content-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {pieces.map(piece => (
                  <div key={piece.id} className="card card-hover" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }} onClick={() => navigate(`/review/${piece.job_id}`)}>
                    <div style={{ height: 130, background: '#161C24', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      {piece.thumbnail_url ? (
                        <img src={piece.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ fontSize: 28 }}>{PLATFORM_MAP[piece.platform]?.icon}</div>
                      )}
                      <div style={{ position: 'absolute', top: 8, right: 8 }}>
                        <span style={{ background: 'rgba(8,11,15,0.8)', padding: '3px 8px', borderRadius: 20, fontSize: 10, color: '#F0F4F8', fontFamily: 'JetBrains Mono' }}>
                          {PLATFORM_MAP[piece.platform]?.name}
                        </span>
                      </div>
                    </div>
                    <div style={{ padding: '10px 12px' }}>
                      <div style={{ fontSize: 11, color: '#8B9EB0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {piece.caption || piece.hook || '—'}
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <JobStatusBadge status={piece.status === 'approved' ? 'scheduled' : piece.status === 'posted' ? 'posted' : 'review'} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Platform health */}
          <div className="card">
            <h3 style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 600, color: '#8B9EB0', marginBottom: 16 }}>PLATFORM STATUS</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PLATFORMS.map(p => {
                const conn = connections.find(c => c.platform === p.id)
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16 }}>{p.icon}</span>
                    <span style={{ flex: 1, fontSize: 13, color: '#F0F4F8' }}>{p.name}</span>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: conn?.is_active ? '#00E5A0' : '#FF4757' }} />
                  </div>
                )
              })}
            </div>
            <button onClick={() => navigate('/settings')} className="btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: 12, marginTop: 16, padding: '7px 14px' }}>
              Manage connections
            </button>
          </div>

          {/* Recent jobs history */}
          <div className="card">
            <h3 style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 600, color: '#8B9EB0', marginBottom: 16 }}>RECENT JOBS</h3>
            {jobs.filter(j => !processingJobs.includes(j)).slice(0, 4).map(job => (
              <div key={job.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <JobStatusBadge status={job.status} />
                <span style={{ fontSize: 12, color: '#8B9EB0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {job.prompt.slice(0, 40)}…
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
