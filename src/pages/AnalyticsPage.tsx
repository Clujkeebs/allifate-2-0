import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Eye, Heart, Share2, Bookmark, TrendingUp } from 'lucide-react'
import { db } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PLATFORMS, PLATFORM_MAP } from '@/constants/platforms'
import type { PostAnalytics, ContentPiece, Platform as PlatformType } from '@/types/database'

const MOCK_CHART_DATA = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
  views: Math.floor(Math.random() * 5000) + 500,
  likes: Math.floor(Math.random() * 500) + 50,
  shares: Math.floor(Math.random() * 200) + 20,
}))

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: '#8B9EB0', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
        <div style={{ color }}>{icon}</div>
      </div>
      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 28, fontWeight: 500, color: '#F0F4F8' }}>{value}</div>
    </div>
  )
}

type TooltipPayloadItem = { name?: string; value?: number; color?: string }
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#161C24', border: '1px solid #1E2A36', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: '#8B9EB0', marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color, display: 'flex', gap: 8, marginBottom: 2 }}>
          <span style={{ fontFamily: 'JetBrains Mono' }}>{(p.value || 0).toLocaleString()}</span>
          <span style={{ color: '#8B9EB0' }}>{p.name}</span>
        </div>
      ))}
    </div>
  )
}

export function AnalyticsPage() {
  const { user } = useAuth()
  const [activePlatform, setActivePlatform] = useState<PlatformType | 'all'>('all')
  const [analytics, setAnalytics] = useState<PostAnalytics[]>([])
  const [pieces, setPieces] = useState<ContentPiece[]>([])
  const [loading, setLoading] = useState(true)
  const [totals, setComputedTotals] = useState({ views: 0, likes: 0, shares: 0, saves: 0 })

  useEffect(() => {
    if (!user) return
    Promise.all([
      // RLS filters by user via content_piece_id → content_pieces.user_id
      db.from('post_analytics').select('*').order('fetched_at', { ascending: false }),
      db.from('content_pieces').select('*').eq('user_id', user.id).eq('status', 'posted').order('posted_at', { ascending: false }).limit(20),
    ]).then(([analyticsRes, piecesRes]) => {
      const aData = analyticsRes.data || []
      setAnalytics(aData)
      setPieces(piecesRes.data || [])
      setComputedTotals(aData.reduce((acc: { views: number; likes: number; shares: number; saves: number }, a: PostAnalytics) => ({
        views: acc.views + a.views,
        likes: acc.likes + a.likes,
        shares: acc.shares + a.shares,
        saves: acc.saves + a.saves,
      }), { views: 0, likes: 0, shares: 0, saves: 0 }))
      setLoading(false)
    })
  }, [user])

  return (
    <div style={{ padding: 28, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 700, color: '#F0F4F8', marginBottom: 4 }}>Analytics</h1>
        <p style={{ color: '#8B9EB0', fontSize: 14 }}>Performance across all your connected platforms</p>
      </div>

      {/* Platform tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        <button
          onClick={() => setActivePlatform('all')}
          style={{ padding: '6px 16px', borderRadius: 20, border: `1px solid ${activePlatform === 'all' ? '#00E5A0' : '#1E2A36'}`, background: activePlatform === 'all' ? 'rgba(0,229,160,0.1)' : 'transparent', color: activePlatform === 'all' ? '#00E5A0' : '#8B9EB0', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'DM Sans' }}
        >
          All Platforms
        </button>
        {PLATFORMS.map(p => (
          <button
            key={p.id}
            onClick={() => setActivePlatform(p.id)}
            style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${activePlatform === p.id ? p.color : '#1E2A36'}`, background: activePlatform === p.id ? p.bgColor : 'transparent', color: activePlatform === p.id ? '#F0F4F8' : '#8B9EB0', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'DM Sans' }}
          >
            <span>{p.icon}</span> {p.name}
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard label="Total Views" value={totals.views > 0 ? totals.views.toLocaleString() : '—'} icon={<Eye size={16} />} color="#00B4D8" />
        <StatCard label="Total Likes" value={totals.likes > 0 ? totals.likes.toLocaleString() : '—'} icon={<Heart size={16} />} color="#e1306c" />
        <StatCard label="Total Shares" value={totals.shares > 0 ? totals.shares.toLocaleString() : '—'} icon={<Share2 size={16} />} color="#1d9bf0" />
        <StatCard label="Total Saves" value={totals.saves > 0 ? totals.saves.toLocaleString() : '—'} icon={<Bookmark size={16} />} color="#FFB547" />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 28 }}>
        {/* Views over time */}
        <div className="card">
          <h3 style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 600, color: '#8B9EB0', marginBottom: 20 }}>VIEWS OVER TIME — LAST 30 DAYS</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={MOCK_CHART_DATA} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00E5A0" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00E5A0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#4A5E70', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#4A5E70', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="views" stroke="#00E5A0" strokeWidth={2} fill="url(#viewsGradient)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Engagement per platform */}
        <div className="card">
          <h3 style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 600, color: '#8B9EB0', marginBottom: 20 }}>ENGAGEMENT BY PLATFORM</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {PLATFORMS.slice(0, 5).map(p => {
              const pAnalytics = analytics.filter(a => a.platform === p.id)
              const totalLikes = pAnalytics.reduce((s, a) => s + a.likes, 0)
              const maxLikes = 1000
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{p.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: '#8B9EB0', marginBottom: 4, fontFamily: 'JetBrains Mono' }}>{totalLikes.toLocaleString()} likes</div>
                    <div style={{ height: 4, background: '#1E2A36', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, (totalLikes / maxLikes) * 100)}%`, background: p.color, borderRadius: 2, transition: 'width 1s ease' }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="card" style={{ marginBottom: 28, background: 'linear-gradient(135deg, rgba(0,229,160,0.04), rgba(0,180,216,0.02))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <TrendingUp size={16} color="#00E5A0" />
          <h3 style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 600, color: '#00E5A0', margin: 0 }}>AI INSIGHTS</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {[
            'Your Reels get 3x more saves when they include a list format.',
            'TikTok posts published on Tuesday 7pm get 34% more views.',
            'LinkedIn posts with native video get 5x more impressions than links.',
            'Pinterest descriptions with 3+ keywords drive 2x outbound clicks.',
          ].map((insight, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: '#161C24', borderRadius: 8 }}>
              <span style={{ color: '#00E5A0', fontSize: 16, flexShrink: 0 }}>💡</span>
              <span style={{ fontSize: 13, color: '#8B9EB0', lineHeight: 1.5 }}>{insight}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top posts table */}
      <div className="card">
        <h3 style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 600, color: '#8B9EB0', marginBottom: 16 }}>TOP PERFORMING POSTS</h3>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 0' }}>
            {[0,1,2,3,4].map(i => <div key={i} className="animate-shimmer" style={{ height: 40, borderRadius: 6 }} />)}
          </div>
        ) : pieces.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#4A5E70', padding: '32px 0', fontSize: 13 }}>No posted content yet</div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px 80px 80px 80px', gap: 12, padding: '8px 0', borderBottom: '1px solid #1E2A36', marginBottom: 8 }}>
              {['CONTENT', 'PLATFORM', 'VIEWS', 'LIKES', 'SHARES', 'SAVES'].map(h => (
                <div key={h} style={{ fontSize: 10, color: '#4A5E70', fontFamily: 'JetBrains Mono', letterSpacing: '0.5px' }}>{h}</div>
              ))}
            </div>
            {pieces.slice(0, 10).map(piece => {
              const a = analytics.find(a => a.content_piece_id === piece.id)
              return (
                <div key={piece.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px 80px 80px 80px', gap: 12, padding: '10px 0', borderBottom: '1px solid #1E2A36', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: '#F0F4F8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {piece.hook || piece.caption?.slice(0, 50) || '—'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{PLATFORM_MAP[piece.platform]?.icon}</span>
                    <span style={{ fontSize: 12, color: '#8B9EB0' }}>{PLATFORM_MAP[piece.platform]?.name}</span>
                  </div>
                  {['views', 'likes', 'shares', 'saves'].map(key => (
                    <div key={key} style={{ fontSize: 12, color: '#F0F4F8', fontFamily: 'JetBrains Mono' }}>
                      {a ? String(a[key as keyof typeof a] ?? '—') === '0' ? '—' : (a[key as keyof typeof a] as number)?.toLocaleString?.() ?? '—' : '—'}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
