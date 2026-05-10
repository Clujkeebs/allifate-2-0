import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, TrendingUp, Eye, Heart, Share2, Clock, CheckCircle, AlertCircle, Loader2, Zap, Sparkles } from 'lucide-react'
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

const NICHE_ICONS: Record<string, string> = {
  reddit: '🤖',
  motivation: '🔥',
  horror: '👻',
  finance: '💰',
  facts: '💡',
}

export function DashboardPage() {
...
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard label="VIRAL REACH" value={totals.views > 0 ? totals.views.toLocaleString() : '0'} change={totals.views > 0 ? '+12% from last week' : undefined} icon={<Eye size={16} />} />
        <StatCard label="ENGAGEMENT" value={totals.views > 0 ? ((totals.likes + totals.shares + totals.saves) / totals.views * 100).toFixed(1) + '%' : '0%'} icon={<Heart size={16} />} />
        <StatCard label="APPROVED POSTS" value={String(postedThisMonth)} change={postedThisMonth > 0 ? '+' + postedThisMonth + ' this month' : undefined} icon={<CheckCircle size={16} />} />
        <StatCard label="CREATION CREDITS" value={String(subscription?.posts_limit === -1 ? '∞' : (subscription?.posts_limit || 0) - (subscription?.posts_used_this_month || 0))} icon={<Zap size={16} />} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
        {/* Recent jobs + pieces */}
        <div>
          {/* Active jobs */}
          {processingJobs.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 600, color: '#8B9EB0', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E5A0', animation: 'pulse-glow 1.5s infinite' }} />
                AUTOMATION PIPELINE
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {processingJobs.map(job => (
                  <div key={job.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, border: '1px solid rgba(0,229,160,0.15)' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(0,229,160,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                      {(job as any).niche ? NICHE_ICONS[(job as any).niche] || '✨' : '✨'}
                    </div>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
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
                    {conn?.provider === 'zerio' && (
                      <span style={{ fontSize: 8, color: '#00B4D8', fontFamily: 'JetBrains Mono', background: 'rgba(0,180,216,0.12)', padding: '1px 5px', borderRadius: 6 }}>ZERIO</span>
                    )}
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
