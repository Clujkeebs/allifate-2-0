import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Loader2, Check, X, RefreshCw, Zap, Webhook, AlertTriangle, Link2, ChevronDown, ChevronRight, Sparkles } from 'lucide-react'
import { db } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PLATFORMS, SUBSCRIPTION_PLANS, NICHES, TONES } from '@/constants/platforms'
import { isZerioConfigured, getAuthUrl as getZerioAuthUrl } from '@/lib/zerio'
import type { PlatformConnection } from '@/types/database'

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
  const [pendingOAuth, setPendingOAuth] = useState<string | null>(null)
  const [zerioConnecting, setZerioConnecting] = useState(false)
  const [showAdvancedOAuth, setShowAdvancedOAuth] = useState(false)
  const zerioAvailable = isZerioConfigured()

  useEffect(() => {
    if (!user) return
    db.from('platform_connections').select('*').eq('user_id', user.id).then(({ data }: { data: any }) => {
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

  // ── Zerio: Connect all platforms in one flow ───────────────────
  async function connectAllViaZerio() {
    if (!user) return
    setZerioConnecting(true)
    try {
      const redirectUri = `${window.location.origin}/oauth/callback?provider=zerio`
      const { url } = await getZerioAuthUrl(redirectUri, user.id)
      window.location.href = url
    } catch (err) {
      setZerioConnecting(false)
      console.error('Zerio auth URL error:', err)
    }
  }

  // ── Direct OAuth: per-platform (fallback when Zerio not configured) ──
  function getOAuthUrl(platformId: string): string | null {
    // Vite statically replaces import.meta.env.VITE_* at build time — must access each explicitly
    const clientIds: Record<string, string | undefined> = {
      tiktok: import.meta.env.VITE_TIKTOK_CLIENT_KEY,
      instagram: import.meta.env.VITE_INSTAGRAM_CLIENT_ID,
      youtube: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      twitter: import.meta.env.VITE_TWITTER_CLIENT_ID,
      linkedin: import.meta.env.VITE_LINKEDIN_CLIENT_ID,
      facebook: import.meta.env.VITE_FACEBOOK_CLIENT_ID,
      pinterest: import.meta.env.VITE_PINTEREST_CLIENT_ID,
      snapchat: import.meta.env.VITE_SNAPCHAT_CLIENT_ID,
    }
    const clientId = clientIds[platformId]
    if (!clientId) return null

    const origin = window.location.origin
    const state = user!.id
    const redirect = encodeURIComponent(`${origin}/oauth/callback?platform=${platformId}&provider=direct`)

    const urls: Record<string, string> = {
      tiktok: `https://www.tiktok.com/auth/authorize/?client_key=${clientId}&scope=user.info.basic,video.publish&redirect_uri=${redirect}&state=${state}&response_type=code`,
      instagram: `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirect}&scope=user_profile,user_media&response_type=code&state=${state}`,
      youtube: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirect}&scope=https://www.googleapis.com/auth/youtube.upload&response_type=code&access_type=offline&state=${state}`,
      twitter: `https://twitter.com/i/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirect}&scope=tweet.read%20tweet.write%20users.read&response_type=code&state=${state}&code_challenge=challenge&code_challenge_method=plain`,
      linkedin: `https://www.linkedin.com/oauth/v2/authorization?client_id=${clientId}&redirect_uri=${redirect}&scope=openid%20profile%20w_member_social&response_type=code&state=${state}`,
      facebook: `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirect}&scope=pages_manage_posts,pages_read_engagement&response_type=code&state=${state}`,
      pinterest: `https://www.pinterest.com/oauth/?client_id=${clientId}&redirect_uri=${redirect}&scope=pins:read,pins:write&response_type=code&state=${state}`,
      snapchat: `https://accounts.snapchat.com/accounts/oauth2/auth?client_id=${clientId}&redirect_uri=${redirect}&scope=snapchat-marketing-api&response_type=code&state=${state}`,
    }
    return urls[platformId] ?? null
  }

  async function connectPlatform(platformId: string) {
    const url = getOAuthUrl(platformId)
    if (!url) {
      setPendingOAuth(platformId)
      return
    }
    window.location.href = url
  }

  function proceedWithOAuth() {
    if (!pendingOAuth) return
    const platformId = pendingOAuth
    setPendingOAuth(null)
    const origin = window.location.origin
    const state = user!.id
    const redirect = encodeURIComponent(`${origin}/oauth/callback?platform=${platformId}&provider=direct`)
    const fallbackUrls: Record<string, string> = {
      tiktok: `https://www.tiktok.com/auth/authorize/?client_key=YOUR_CLIENT_KEY&scope=user.info.basic,video.publish&redirect_uri=${redirect}&state=${state}&response_type=code`,
      instagram: `https://api.instagram.com/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=${redirect}&scope=user_profile,user_media&response_type=code&state=${state}`,
      youtube: `https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=${redirect}&scope=https://www.googleapis.com/auth/youtube.upload&response_type=code&access_type=offline&state=${state}`,
      twitter: `https://twitter.com/i/oauth2/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=${redirect}&scope=tweet.read%20tweet.write%20users.read&response_type=code&state=${state}&code_challenge=challenge&code_challenge_method=plain`,
      linkedin: `https://www.linkedin.com/oauth/v2/authorization?client_id=YOUR_CLIENT_ID&redirect_uri=${redirect}&scope=openid%20profile%20w_member_social&response_type=code&state=${state}`,
      facebook: `https://www.facebook.com/v18.0/dialog/oauth?client_id=YOUR_CLIENT_ID&redirect_uri=${redirect}&scope=pages_manage_posts,pages_read_engagement&response_type=code&state=${state}`,
      pinterest: `https://www.pinterest.com/oauth/?client_id=YOUR_CLIENT_ID&redirect_uri=${redirect}&scope=pins:read,pins:write&response_type=code&state=${state}`,
      snapchat: `https://accounts.snapchat.com/accounts/oauth2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=${redirect}&scope=snapchat-marketing-api&response_type=code&state=${state}`,
    }
    window.location.href = fallbackUrls[platformId] || ''
  }

  async function disconnectPlatform(connectionId: string) {
    await db.from('platform_connections').update({ is_active: false }).eq('id', connectionId)
    setConnections(prev => prev.map(c => c.id === connectionId ? { ...c, is_active: false } : c))
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
          {/* ── Zerio: Primary connection method ── */}
          <Section title="Connect Your Platforms">
            {zerioAvailable ? (
              /* Zerio is configured — show as primary */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(0,229,160,0.08) 0%, rgba(0,180,216,0.05) 100%)',
                  border: '1px solid rgba(0,229,160,0.2)',
                  borderRadius: 14,
                  padding: '24px 28px',
                  display: 'flex', flexDirection: 'column', gap: 14,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: 'linear-gradient(135deg, #00E5A0, #00B4D8)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Link2 size={22} color="#080B0F" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 700, color: '#F0F4F8' }}>
                          Connect All Platforms
                        </span>
                        <span style={{
                          fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 600,
                          padding: '2px 8px', borderRadius: 10,
                          background: 'rgba(0,229,160,0.12)', color: '#00E5A0',
                        }}>
                          POWERED BY ZERIO
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: '#8B9EB0', margin: 0, lineHeight: 1.5 }}>
                        Connect TikTok, Instagram, YouTube, X, LinkedIn, Facebook, Pinterest, and Snapchat in one click.
                        Zerio handles OAuth tokens, refresh, and platform API changes so you don&apos;t have to.
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      onClick={connectAllViaZerio}
                      disabled={zerioConnecting}
                      className="btn-primary"
                      style={{ fontSize: 14, padding: '10px 24px', gap: 8 }}
                    >
                      {zerioConnecting ? (
                        <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <Link2 size={15} />
                      )}
                      {zerioConnecting ? 'Redirecting to Zerio…' : 'Connect via Zerio'}
                    </button>
                    <button
                      onClick={() => setShowAdvancedOAuth(!showAdvancedOAuth)}
                      className="btn-secondary"
                      style={{ fontSize: 12, padding: '10px 16px', gap: 4 }}
                    >
                      {showAdvancedOAuth ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      Manual OAuth (advanced)
                    </button>
                  </div>
                </div>

                {/* Platform status list (Zerio-managed) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {PLATFORMS.map(platform => {
                    const conn = connections.find(c => c.platform === platform.id && c.is_active)
                    return (
                      <div key={platform.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: platform.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {platform.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#F0F4F8', fontFamily: 'Syne' }}>
                              {platform.name}
                            </span>
                            {conn?.provider === 'zerio' && (
                              <span style={{ fontSize: 9, color: '#00B4D8', fontFamily: 'JetBrains Mono', background: 'rgba(0,180,216,0.1)', padding: '1px 6px', borderRadius: 8 }}>
                                ZERIO
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: '#8B9EB0' }}>
                            {conn ? conn.account_name : 'Not connected'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: conn ? '#00E5A0' : '#FF4757' }} />
                          {conn ? (
                            <button onClick={() => disconnectPlatform(conn.id)} className="btn-secondary" style={{ fontSize: 11, padding: '5px 10px' }}>
                              <X size={11} /> Disconnect
                            </button>
                          ) : (
                            <span style={{ fontSize: 11, color: '#4A5E70' }}>—</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              /* Zerio not configured — show setup prompt + per-platform OAuth */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Zerio promo card */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(0,180,216,0.06), rgba(0,229,160,0.03))',
                  border: '1px solid rgba(0,180,216,0.18)',
                  borderRadius: 14,
                  padding: '20px 24px',
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Sparkles size={18} color="#00B4D8" />
                    <span style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 700, color: '#F0F4F8' }}>
                      Connect via Zerio (recommended)
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: '#8B9EB0', margin: 0, lineHeight: 1.5 }}>
                    Zerio handles all 8 platform OAuth connections through a single integration — no per-platform client IDs needed.
                    Once you get your API keys, add them to your <code style={{ background: '#161C24', padding: '1px 5px', borderRadius: 3, fontSize: 11, fontFamily: 'JetBrains Mono', color: '#00E5A0' }}>.env</code>:
                  </p>
                  <code style={{
                    display: 'block', fontSize: 11, fontFamily: 'JetBrains Mono', color: '#00B4D8',
                    padding: '10px 14px', background: '#0F1318', borderRadius: 6,
                    border: '1px solid #1E2A36', lineHeight: 1.8,
                  }}>
                    VITE_ZERIO_API_KEY=your_api_key_here{'\n'}
                    ZERIO_API_SECRET=your_secret_here{'\n'}
                    VITE_ZERIO_REFERRAL_CODE=your_referral_code
                  </code>
                  <p style={{ fontSize: 12, color: '#4A5E70', margin: 0 }}>
                    <ExternalLink size={10} style={{ display: 'inline', marginRight: 4 }} />
                    Don&apos;t have a Zerio account? Contact them at{' '}
                    <a href="https://zerio.io" target="_blank" rel="noopener noreferrer" style={{ color: '#00B4D8', textDecoration: 'underline' }}>
                      zerio.io
                    </a>{' '}
                    and mention referral code <strong style={{ color: '#00E5A0' }}>VIRLO</strong> to get priority access.
                  </p>
                </div>

                {/* Per-platform OAuth as fallback */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: '#8B9EB0', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Manual OAuth (per-platform)
                    </span>
                  </div>
                  {PLATFORMS.map(platform => {
                    const conn = connections.find(c => c.platform === platform.id && c.is_active)
                    return (
                      <div key={platform.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: platform.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {platform.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#F0F4F8', fontFamily: 'Syne' }}>{platform.name}</div>
                          <div style={{ fontSize: 12, color: '#8B9EB0' }}>
                            {conn ? conn.account_name : 'Not connected'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: conn ? '#00E5A0' : '#FF4757' }} />
                          {conn ? (
                            <button onClick={() => disconnectPlatform(conn.id)} className="btn-secondary" style={{ fontSize: 11, padding: '5px 10px' }}>
                              <X size={11} /> Disconnect
                            </button>
                          ) : (
                            <button onClick={() => connectPlatform(platform.id)} className="btn-primary" style={{ fontSize: 11, padding: '5px 12px' }}>
                              Connect
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </Section>

          {/* ── Advanced OAuth (collapsible, shown when Zerio is active) ── */}
          {zerioAvailable && showAdvancedOAuth && (
            <>
              {/* OAuth not configured inline notice */}
              {pendingOAuth && (() => {
                const platform = PLATFORMS.find(p => p.id === pendingOAuth)
                return (
                  <div style={{
                    marginBottom: 16, padding: '16px 20px',
                    background: 'rgba(255,181,71,0.08)', border: '1px solid rgba(255,181,71,0.25)',
                    borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <AlertTriangle size={16} color="#FFB547" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#FFB547', fontFamily: 'Syne' }}>
                        OAuth credentials not configured for {platform?.name || pendingOAuth}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: '#8B9EB0', margin: 0, lineHeight: 1.5 }}>
                      Add <code style={{ background: '#161C24', padding: '1px 5px', borderRadius: 3, fontSize: 11, fontFamily: 'JetBrains Mono', color: '#00E5A0' }}>VITE_{pendingOAuth.toUpperCase()}_CLIENT_ID</code> to your <code style={{ background: '#161C24', padding: '1px 5px', borderRadius: 3, fontSize: 11, fontFamily: 'JetBrains Mono', color: '#00E5A0' }}>.env</code> file, then restart the dev server.
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button onClick={proceedWithOAuth} className="btn-secondary" style={{ fontSize: 12, padding: '6px 14px', gap: 4 }}>
                        Open OAuth URL anyway
                      </button>
                      <button onClick={() => setPendingOAuth(null)} className="btn-secondary" style={{ fontSize: 12, padding: '6px 14px', gap: 4 }}>
                        <X size={12} /> Dismiss
                      </button>
                    </div>
                  </div>
                )
              })()}

              <Section title="Manual OAuth Connections (Advanced)">
                <div style={{
                  background: 'rgba(255,181,71,0.04)', border: '1px solid rgba(255,181,71,0.12)',
                  borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                }}>
                  <AlertTriangle size={14} color="#FFB547" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 12, color: '#8B9EB0', lineHeight: 1.5 }}>
                    These direct OAuth connections are independent of Zerio. Use only if you need a platform-specific integration.
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {PLATFORMS.map(platform => {
                    const conn = connections.find(c => c.platform === platform.id && c.is_active && c.provider === 'direct')
                    return (
                      <div key={platform.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: 0.85 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: platform.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {platform.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#F0F4F8', fontFamily: 'Syne' }}>{platform.name}</div>
                          <div style={{ fontSize: 12, color: '#8B9EB0' }}>
                            {conn ? conn.account_name : 'Not connected'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: conn ? '#00E5A0' : '#FF4757' }} />
                          {conn ? (
                            <button onClick={() => disconnectPlatform(conn.id)} className="btn-secondary" style={{ fontSize: 11, padding: '5px 10px' }}>
                              <X size={11} /> Disconnect
                            </button>
                          ) : (
                            <button onClick={() => connectPlatform(platform.id)} className="btn-primary" style={{ fontSize: 11, padding: '5px 12px' }}>
                              Connect
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Section>
            </>
          )}

          {/* ── Zapier Integration ── */}
          <Section title="Automation via Zapier">
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,74,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Webhook size={18} color="#FF4A00" />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#F0F4F8', fontFamily: 'Syne' }}>Zapier Webhook Integration</div>
                  <div style={{ fontSize: 12, color: '#8B9EB0', lineHeight: 1.5 }}>
                    Connect Virlo to 5,000+ apps via Zapier. Trigger content creation, receive posting confirmations, and sync analytics — all without writing code.
                  </div>
                </div>
              </div>
              <div style={{ background: '#161C24', borderRadius: 8, padding: '14px 16px', border: '1px solid #1E2A36' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: '#8B9EB0', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Webhook URL</span>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/api/zapier-webhook`
                      navigator.clipboard.writeText(url).then(() => {
                        const el = document.activeElement as HTMLElement
                        if (el) { el.blur() }
                      })
                    }}
                    className="btn-secondary"
                    style={{ fontSize: 11, padding: '4px 10px', gap: 4 }}
                  >
                    Copy URL
                  </button>
                </div>
                <code style={{
                  display: 'block', fontSize: 12, fontFamily: 'JetBrains Mono', color: '#00E5A0',
                  padding: '10px 14px', background: '#0F1318', borderRadius: 6,
                  wordBreak: 'break-all', border: '1px solid #1E2A36',
                }}>
                  {window.location.origin}/api/zapier-webhook
                </code>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', background: 'rgba(0,180,216,0.06)', borderRadius: 8, border: '1px solid rgba(0,180,216,0.15)' }}>
                <Sparkles size={14} color="#00B4D8" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12, color: '#8B9EB0', lineHeight: 1.5 }}>
                  For the best experience, connect via Zerio above — it handles all 8 platforms in one go. Use Zapier as a fallback or for custom workflows.
                </span>
              </div>
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
              <div style={{ display: 'flex', gap: 10 }}>
                <a href="https://billing.stripe.com" target="_blank" rel="noopener noreferrer">
                  <button className="btn-secondary" style={{ fontSize: 13, gap: 6 }}>
                    <ExternalLink size={13} /> Manage Billing
                  </button>
                </a>
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
                        <button className="btn-primary" style={{ fontSize: 12, padding: '6px 14px', marginTop: 8 }}>
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
