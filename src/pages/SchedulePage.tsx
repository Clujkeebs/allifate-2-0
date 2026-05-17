import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, Trash2, Clock, Loader2, AlertCircle } from 'lucide-react'
import { db } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PLATFORM_MAP } from '@/constants/platforms'
import type { ScheduledPost } from '@/types/database'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns'

export function SchedulePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    setFetchError(false)
    db.from('scheduled_posts').select('*').eq('user_id', user.id).order('scheduled_for').then(({ data, error }: { data: ScheduledPost[] | null; error: unknown }) => {
      if (error) {
        setFetchError(true)
        setLoading(false)
        return
      }
      setPosts(data || [])
      setLoading(false)
    })
  }, [user, retryKey])

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Pad start of month
  const startPad = monthStart.getDay()
  const paddedDays: (Date | null)[] = [...Array(startPad).fill(null), ...days]

  const postsOnDay = (day: Date) => posts.filter(p => isSameDay(new Date(p.scheduled_for), day))
  const selectedDayPosts = selectedDay ? postsOnDay(selectedDay) : []

  async function cancelPost(id: string) {
    setCancelError(null)
    setCancellingId(id)
    const { error } = await db.from('scheduled_posts').update({ status: 'cancelled' }).eq('id', id)
    if (error) {
      setCancelError('Failed to cancel post. Please try again.')
      setCancellingId(null)
      return
    }
    setPosts(prev => prev.filter(p => p.id !== id))
    setCancellingId(null)
  }

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (fetchError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
        <AlertCircle size={32} color="#FF4757" />
        <h2 style={{ fontFamily: 'Syne', fontSize: 20, color: '#F0F4F8' }}>Failed to load schedule</h2>
        <p style={{ color: '#8B9EB0', fontSize: 14 }}>Check your connection and try refreshing the page.</p>
        <button onClick={() => setRetryKey(k => k + 1)} className="btn-primary">Retry</button>
      </div>
    )
  }

  return (
    <div style={{ padding: 28, maxWidth: 1100, margin: '0 auto' }}>
      {cancelError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.2)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#FF4757' }}>
          <AlertCircle size={14} />
          <span style={{ flex: 1 }}>{cancelError}</span>
          <button onClick={() => setCancelError(null)} style={{ background: 'none', border: 'none', color: '#FF4757', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 700, color: '#F0F4F8', marginBottom: 4 }}>Schedule</h1>
          <p style={{ color: '#8B9EB0', fontSize: 14 }}>{posts.filter(p => p.status === 'scheduled').length} posts queued</p>
        </div>
        <button onClick={() => navigate('/create')} className="btn-primary" style={{ fontSize: 13 }}>
          <Plus size={16} /> Create New
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        {/* Calendar */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Month nav */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #1E2A36', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="btn-ghost">
              <ChevronLeft size={16} />
            </button>
            <h2 style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 700, color: '#F0F4F8', margin: 0 }}>
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="btn-ghost">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '8px 12px' }}>
            {WEEKDAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, color: '#4A5E70', fontFamily: 'JetBrains Mono', padding: '4px 0' }}>{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '0 12px 12px', gap: 2 }}>
            {paddedDays.map((day, i) => {
              if (!day) return <div key={i} />
              const dayPosts = postsOnDay(day)
              const isSelected = selectedDay && isSameDay(day, selectedDay)
              const isT = isToday(day)
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  style={{
                    minHeight: 72,
                    background: isSelected ? 'rgba(0,229,160,0.08)' : 'transparent',
                    border: `1px solid ${isSelected ? 'rgba(0,229,160,0.3)' : '#1E2A36'}`,
                    borderRadius: 8,
                    padding: '6px 4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{
                    fontSize: 12,
                    fontWeight: isT ? 700 : 400,
                    color: isT ? '#00E5A0' : '#F0F4F8',
                    fontFamily: isT ? 'Syne' : 'DM Sans',
                    display: 'block',
                    marginBottom: 2,
                    alignSelf: 'flex-end',
                    background: isT ? 'rgba(0,229,160,0.1)' : 'transparent',
                    borderRadius: 4,
                    padding: '1px 4px',
                  }}>
                    {format(day, 'd')}
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {dayPosts.slice(0, 3).map(p => (
                      <div
                        key={p.id}
                        title={PLATFORM_MAP[p.platform]?.name}
                        style={{
                          width: 14, height: 14, borderRadius: 3,
                          background: PLATFORM_MAP[p.platform]?.bgColor || '#1E2A36',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9,
                        }}
                      >
                        {PLATFORM_MAP[p.platform]?.icon}
                      </div>
                    ))}
                    {dayPosts.length > 3 && (
                      <div style={{ fontSize: 8, color: '#8B9EB0', alignSelf: 'center' }}>+{dayPosts.length - 3}</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Side panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Selected day posts */}
          <div className="card">
            <h3 style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 600, color: '#8B9EB0', marginBottom: 16 }}>
              {selectedDay ? format(selectedDay, 'MMMM d') : 'Select a day'}
            </h3>
            {selectedDayPosts.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#4A5E70', fontSize: 13, padding: '20px 0' }}>
                {selectedDay ? 'No posts scheduled' : 'Click a day to see scheduled posts'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedDayPosts.map(post => (
                  <div key={post.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#161C24', borderRadius: 8 }}>
                    <span style={{ fontSize: 16 }}>{PLATFORM_MAP[post.platform]?.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: '#F0F4F8', fontWeight: 500 }}>{PLATFORM_MAP[post.platform]?.name}</div>
                      <div style={{ fontSize: 11, color: '#8B9EB0', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={10} /> {format(new Date(post.scheduled_for), 'h:mm a')}
                      </div>
                    </div>
                    <span style={{ padding: '2px 6px', borderRadius: 10, fontSize: 10, background: post.status === 'posted' ? 'rgba(0,200,150,0.1)' : post.status === 'failed' ? 'rgba(255,71,87,0.1)' : 'rgba(255,181,71,0.1)', color: post.status === 'posted' ? '#00C896' : post.status === 'failed' ? '#FF4757' : '#FFB547', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
                      {post.status.toUpperCase()}
                    </span>
                    {post.status === 'scheduled' && (
                      <button
                        onClick={() => cancelPost(post.id)}
                        disabled={cancellingId === post.id}
                        className="btn-ghost"
                        style={{ padding: 4, opacity: cancellingId === post.id ? 0.5 : 1 }}
                      >
                        {cancellingId === post.id
                          ? <Loader2 size={12} color="#FF4757" className="animate-spin" />
                          : <Trash2 size={12} color="#FF4757" />
                        }
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming queue */}
          <div className="card">
            <h3 style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 600, color: '#8B9EB0', marginBottom: 16 }}>UPCOMING QUEUE</h3>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[0,1,2,3].map(i => <div key={i} className="animate-shimmer" style={{ height: 24, borderRadius: 4 }} />)}
              </div>
            ) : posts.filter(p => p.status === 'scheduled').slice(0, 6).map(post => (
              <div key={post.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 14 }}>{PLATFORM_MAP[post.platform]?.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: '#F0F4F8', fontFamily: 'JetBrains Mono' }}>
                    {format(new Date(post.scheduled_for), 'MMM d · h:mm a')}
                  </div>
                </div>
              </div>
            ))}
            {!loading && posts.filter(p => p.status === 'scheduled').length === 0 && (
              <div style={{ color: '#4A5E70', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>Queue is empty</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
