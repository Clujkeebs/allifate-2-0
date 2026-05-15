import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Loader2, Check, X, Zap, Link2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { db, supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PLATFORMS, SUBSCRIPTION_PLANS, NICHES, TONES } from '@/constants/platforms'
import { isZernioConfigured, getAuthUrl as getZernioAuthUrl, disconnectPlatform as disconnectZernioPlatform } from '@/lib/zernio'
import type { PlatformConnection, Platform } from '@/types/database'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontFamily: 'JetBrains Mono', fontSize: 14, fontWeight: 600, color: '#8B9EB0', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</h2>
      {children}
    </div>
  )
}

export function SettingsPage() {
  const { user, profile, subscription } = useAuth()
  const navigate = useNavigate()
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const [name, setName] = useState(profile?.full_name || '')
  const [niche, setNiche] = useState(profile?.niche || '')
  const [tone, setTone] = useState(profile?.tone_preference || '')
  const [autopilot, setAutopilot] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'platforms' | 'billing' | 'notifications'>('profile')
  const [connectingPlatform, setConnectingPlatform] = useState<Platform | 'all' | null>(null)
  const [billingPortalLoading, setBillingPortalLoading] = useState(false)
  const zernioEnabled = isZernioConfigured()

  useEffect(() => {
    if (!user) return
    db.from('platform_connections').select('*').eq('user_id', user.id).then(({ data }: { data: PlatformConnection[] | null }) => {
      setConnections(data || [])
    })
    if (profile) {
      const to = setTimeout(() => {
        setName(profile.full_name || '')
        setNiche(profile.niche || '')
        setTone(profile.tone_preference || '')
      }, 0)
      return () => clearTimeout(to)
    }
  }, [user, profile])

  async function saveProfile() {
    if (!user) return
    setSaving(true)
    await db.from('profiles').upsert({ id: user.id, full_name: name, niche, tone_preference: tone })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function connectAllViaZernio() {
    if (!user) return
    if (!zernioEnabled) {
      toast.error('Zernio is not configured. Set VITE_ZERNIO_API_KEY in env to enable bundled OAuth.')
      return
    }
    setConnectingPlatform('all')
    try {
      const redirectUri = `${window.location.origin}/oauth/callback?provider=zernio`
      const { url } = await getZernioAuthUrl(redirectUri, user.id)
      window.location.assign(url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start Zernio authorization')
      setConnectingPlatform(null)
    }
  }

  async function connectPlatform(platformId: Platform) {
    if (!user) return
    setConnectingPlatform(platformId)

    // Prefer the bundled Zernio flow when it's available — single redirect, all 8 platforms.
    if (zernioEnabled) {
      await connectAllViaZernio()
      return
    }

    // Direct OAuth fallback. We expect a per-platform AUTHORIZE_URL_<PLATFORM> env on the
    // edge function side; if it's missing, surface a clear error rather than fake data.
    try {
      const state = encodeURIComponent(user.id)
      const redirectUri = encodeURIComponent(
        `${window.location.origin}/oauth/callback?platform=${platformId}&provider=direct`,
      )
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oauth-exchange/authorize?platform=${platformId}&redirect_uri=${redirectUri}&state=${state}`,
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'OAuth authorize endpoint failed' }))
        throw new Error(body.error || `Authorize failed (${res.status})`)
      }
      const { url } = await res.json()
      if (!url) throw new Error('Authorize endpoint returned no URL')
      window.location.assign(url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Could not start ${platformId} OAuth`)
      setConnectingPlatform(null)
    }
  }

  async function disconnectPlatform(conn: PlatformConnection) {
    if (!user) return
    // Best-effort revoke at the provider before flipping the local row inactive.
    try {
      if (conn.provider === 'zernio' && zernioEnabled) {
        await disconnectZernioPlatform(user.id, conn.platform)
      }
    } catch (err) {
      console.warn('Provider-side disconnect failed (continuing):', err)
    }
    await db.from('platform_connections').update({ is_active: false }).eq('id', conn.id)
    setConnections(prev => prev.map(c => c.id === conn.id ? { ...c, is_active: false } : c))
    toast.success(`${conn.platform} disconnected`)
  }

  async function openBillingPortal() {
    if (!user) return
    setBillingPortalLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/billing-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Billing portal unavailable' }))
        throw new Error(body.error || `Billing portal failed (${res.status})`)
      }
      const { url } = await res.json()
      if (url) window.location.assign(url)
      else throw new Error('No billing portal URL returned')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open billing portal')
    } finally {
      setBillingPortalLoading(false)
    }
  }

  const currentPlan = SUBSCRIPTION_PLANS.find(p => p.id === subscription?.tier) || SUBSCRIPTION_PLANS[0]

  return (
    <div style={{ padding: 28, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 700, color: '#F0F4F8', marginBottom: 4 }}>Settings</h1>
        <p style={{ color: '#8B9EB0', fontSize: 14 }}>Manage your account, platforms, and subscription</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderBottom: '1px solid #1E2A36' }}>
        {[
          { id: 'profile', label: 'Profile' },
          { id: 'platforms', label: 'Platforms' },
          { id: 'billing', label: 'Billing' },
          { id: 'notifications', label: 'Notifications' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeTab === tab.id ? '#00E5A0' : 'transparent'}`,
              color: activeTab === tab.id ? '#F0F4F8' : '#8B9EB0',
              cursor: 'pointer',
              fontSize: 14,
              fontFamily: 'Syne',
              fontWeight: activeTab === tab.id ? 600 : 400,
              marginBottom: -1,
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <div className="animate-fade-in">
          <Section title="Your Profile">
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ fontSize: 12, color: '#8B9EB0', display: 'block', marginBottom: 8 }}>Full name / Brand name</label>
                <input className="input-base" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#8B9EB0', display: 'block', marginBottom: 8 }}>Email</label>
                <input className="input-base" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#8B9EB0', display: 'block', marginBottom: 8 }}>Content niche</label>
                <select className="input-base" value={niche} onChange={e => setNiche(e.target.value)}>
                  <option value="">Select a niche</option>
                  {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#8B9EB0', display: 'block', marginBottom: 8 }}>Default tone</label>
                <select className="input-base" value={tone} onChange={e => setTone(e.target.value)}>
                  <option value="">Select a tone</option>
                  {TONES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <button onClick={saveProfile} disabled={saving} className="btn-primary" style={{ alignSelf: 'flex-start', fontSize: 13 }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
                {saved ? 'Saved!' : 'Save changes'}
              </button>
            </div>
          </Section>

          <Section title="Autopilot Mode">
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#F0F4F8', fontFamily: 'Syne', marginBottom: 4 }}>Full Autopilot</div>
                <div style={{ fontSize: 13, color: '#8B9EB0', lineHeight: 1.5 }}>
                  When enabled, approved content posts automatically at scheduled times without additional confirmation.
                </div>
              </div>
              <button
                onClick={() => setAutopilot(!autopilot)}
                style={{
                  width: 48, height: 26, borderRadius: 13,
                  background: autopilot ? '#00E5A0' : '#1E2A36',
                  border: 'none', cursor: 'pointer',
                  position: 'relative', flexShrink: 0, marginLeft: 20,
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  position: 'absolute', top: 3, left: autopilot ? 24 : 3,
                  width: 20, height: 20, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </button>
            </div>
          </Section>
        </div>
      )}

      {activeTab === 'platforms' && (
        <div className="animate-fade-in">
          {zernioEnabled && (
            <Section title="One-click Setup">
              <div className="card" style={{ background: 'linear-gradient(135deg, rgba(0,229,160,0.06), rgba(0,180,216,0.03))', border: '1px solid rgba(0,229,160,0.2)', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #00E5A0, #00B4D8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Link2 size={20} color="#060A0E" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#F0F4F8', fontFamily: 'Syne', marginBottom: 4 }}>
                    Connect all 8 platforms via Zernio
                  </div>
                  <div style={{ fontSize: 13, color: '#8B9EB0', lineHeight: 1.5 }}>
                    A single secure OAuth handshake authorizes TikTok, Instagram, YouTube, X, LinkedIn, Facebook, Pinterest, and Snapchat at once.
                  </div>
                </div>
                <button
                  onClick={connectAllViaZernio}
                  disabled={connectingPlatform !== null}
                  className="btn-primary"
                  style={{ fontSize: 13, whiteSpace: 'nowrap' }}
                >
                  {connectingPlatform === 'all' ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                  Connect all
                </button>
              </div>
            </Section>
          )}
          <Section title="Platform Connections">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {PLATFORMS.map(platform => {
                const conn = connections.find(c => c.platform === platform.id && c.is_active)
                const isBusy = connectingPlatform === platform.id || connectingPlatform === 'all'
                return (
                  <div key={platform.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: platform.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                      {platform.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#F0F4F8', fontFamily: 'Syne' }}>{platform.name}</div>
                      <div style={{ fontSize: 12, color: '#8B9EB0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conn ? `${conn.account_name}${conn.provider === 'zernio' ? ' · via Zernio' : ''}` : 'Not connected'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: conn ? '#00E5A0' : '#3A5060' }} />
                      {conn ? (
                        <button onClick={() => disconnectPlatform(conn)} className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}>
                          <X size={12} /> Disconnect
                        </button>
                      ) : (
                        <button
                          onClick={() => connectPlatform(platform.id)}
                          disabled={isBusy}
                          className="btn-primary"
                          style={{ fontSize: 12, padding: '6px 12px' }}
                        >
                          {isBusy ? <Loader2 size={12} className="animate-spin" /> : null}
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="animate-fade-in">
          <Section title="Current Plan">
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(0,229,160,0.04), rgba(0,180,216,0.02))', border: '1px solid rgba(0,229,160,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Zap size={16} color="#00E5A0" />
                    <span style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 700, color: '#F0F4F8', textTransform: 'capitalize' }}>
                      {subscription?.tier || 'Starter'} Plan
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#8B9EB0' }}>
                    {subscription?.posts_used_this_month || 0} / {subscription?.posts_limit === -1 ? '∞' : subscription?.posts_limit || 20} posts used this month
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: 24, fontWeight: 700, color: '#F0F4F8' }}>
                    ${currentPlan.price}<span style={{ fontSize: 12, color: '#8B9EB0', fontWeight: 400 }}>/mo</span>
                  </div>
                </div>
              </div>
              <div className="progress-bar" style={{ marginBottom: 16 }}>
                <div className="progress-bar-fill" style={{
                  width: subscription?.posts_limit === -1 ? '10%' :
                    `${Math.min(100, ((subscription?.posts_used_this_month || 0) / (subscription?.posts_limit || 20)) * 100)}%`
                }} />
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={openBillingPortal}
                  disabled={billingPortalLoading || !subscription?.stripe_customer_id}
                  className="btn-secondary"
                  style={{ fontSize: 13, gap: 6 }}
                  title={subscription?.stripe_customer_id ? 'Open Stripe billing portal' : 'Upgrade once to enable the billing portal'}
                >
                  {billingPortalLoading ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />}
                  Manage Billing
                </button>
                <button className="btn-primary" style={{ fontSize: 13, gap: 6 }} onClick={() => navigate('/upgrade')}>
                  <Zap size={13} /> Upgrade Plan
                </button>
              </div>
            </div>
          </Section>

          <Section title="Available Plans">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {SUBSCRIPTION_PLANS.map(plan => {
                const isActive = subscription?.tier === plan.id
                return (
                  <div key={plan.id} className="card" style={{ border: `1px solid ${isActive ? 'rgba(0,229,160,0.3)' : '#1E2A36'}`, background: isActive ? 'rgba(0,229,160,0.04)' : '#0F1318', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 700, color: '#F0F4F8' }}>{plan.name}</span>
                        {isActive && <span className="badge badge-accent">CURRENT</span>}
                        {plan.popular && !isActive && <span className="badge badge-warning">POPULAR</span>}
                      </div>
                      <div style={{ fontSize: 13, color: '#8B9EB0' }}>
                        {plan.posts === -1 ? 'Unlimited' : plan.posts} posts · {plan.platforms === 8 ? 'All 8' : plan.platforms} platforms
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 20, fontWeight: 700, color: '#F0F4F8' }}>
                        ${plan.price}<span style={{ fontSize: 11, color: '#8B9EB0', fontWeight: 400 }}>/mo</span>
                      </div>
                      {!isActive && (
                        <button
                          className="btn-primary"
                          style={{ fontSize: 12, padding: '6px 14px', marginTop: 8 }}
                          onClick={() => navigate('/upgrade')}
                        >
                          {subscription?.tier === 'pro' && plan.id === 'starter' ? 'Downgrade' : 'Upgrade'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="animate-fade-in">
          <Section title="Email Notifications">
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Content ready for review', desc: 'Get notified when AI finishes generating your content', defaultOn: true },
                { label: 'Post published', desc: 'Confirmation when content goes live on a platform', defaultOn: true },
                { label: 'Post failed', desc: 'Alert if a scheduled post fails to publish', defaultOn: true },
                { label: 'Weekly performance summary', desc: 'AI-curated insights from your last 7 days', defaultOn: false },
                { label: 'Platform disconnected', desc: 'Alert if an OAuth token expires', defaultOn: true },
              ].map((n, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: i < 4 ? 16 : 0, borderBottom: i < 4 ? '1px solid #1E2A36' : 'none' }}>
                  <div>
                    <div style={{ fontSize: 14, color: '#F0F4F8', fontWeight: 500, marginBottom: 4 }}>{n.label}</div>
                    <div style={{ fontSize: 12, color: '#8B9EB0' }}>{n.desc}</div>
                  </div>
                  <button
                    style={{
                      width: 44, height: 24, borderRadius: 12,
                      background: n.defaultOn ? '#00E5A0' : '#1E2A36',
                      border: 'none', cursor: 'pointer',
                      position: 'relative', flexShrink: 0,
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 2, left: n.defaultOn ? 22 : 2,
                      width: 20, height: 20, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.2s',
                    }} />
                  </button>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}
    </div>
  )
}
