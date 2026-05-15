import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Check, X, Loader2, Link2 } from 'lucide-react'
import { db } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { exchangeCode as exchangeZernioCode, zernioConnectionsToRows } from '@/lib/zernio'

type CallbackState = 'loading' | 'success' | 'error'

export function OAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [state, setState] = useState<CallbackState>('loading')
  const [platform, setPlatform] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [accountName, setAccountName] = useState('')
  const [isZernio, setIsZernio] = useState(false)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false

    async function handleCallback() {
      const code = searchParams.get('code')
      const provider = searchParams.get('provider') // 'zernio' or 'direct'
      const platformParam = searchParams.get('platform')
      const error = searchParams.get('error')
      const stateParam = searchParams.get('state')

      if (provider === 'zernio') {
        // ── Zernio callback flow ───────────────────────────
        setIsZernio(true)

        if (error) {
          setState('error')
          setErrorMessage(`Authorization denied: ${searchParams.get('error_description') || error}`)
          return
        }

        if (!code) {
          setState('error')
          setErrorMessage('No authorization code received from Zernio.')
          return
        }

        if (!user) {
          setState('error')
          setErrorMessage('You must be logged in to connect platforms.')
          return
        }

        // Verify state matches the user ID (CSRF protection)
        if (stateParam && stateParam !== user.id) {
          setState('error')
          setErrorMessage('State mismatch — possible CSRF attack. Please try connecting again.')
          return
        }

        try {
          // Exchange code via Zernio — returns connections for all authorized platforms
          const connections = await exchangeZernioCode(code, user.id)

          if (!connections || connections.length === 0) {
            setState('error')
            setErrorMessage('No platform connections returned from Zernio. Did you authorize any platforms?')
            return
          }

          // Convert Zernio connections to local rows and upsert them all
          const rows = zernioConnectionsToRows(connections, user.id)

          for (const row of rows) {
            await db.from('platform_connections').upsert(row, { onConflict: 'user_id, platform' })
          }

          if (cancelled) return
          setPlatform(`${rows.length} platforms`)
          setAccountName(rows.map(r => r.account_name).filter(Boolean).slice(0, 3).join(', '))
          setState('success')

          timerRef.current = setTimeout(() => navigate('/settings'), 2500)
        } catch (err: unknown) {
          if (cancelled) return
          const message = err instanceof Error ? err.message : 'Failed to exchange Zernio authorization code'
          setErrorMessage(message)
          setState('error')
        }
        return
      }

      // ── Direct OAuth callback flow (per-platform) ──────
      if (!platformParam) {
        setState('error')
        setErrorMessage('Missing platform parameter in callback URL.')
        return
      }

      setPlatform(platformParam)

      // Verify state matches the user ID (CSRF protection)
      if (stateParam && stateParam !== user?.id) {
        setState('error')
        setErrorMessage('State mismatch — possible CSRF attack. Please try connecting again.')
        return
      }

      if (error) {
        setState('error')
        setErrorMessage(`Authorization denied: ${searchParams.get('error_description') || error}`)
        return
      }

      if (!code) {
        setState('error')
        setErrorMessage('No authorization code received.')
        return
      }

      if (!user) {
        setState('error')
        setErrorMessage('You must be logged in to connect a platform.')
        return
      }

      try {
        // Exchange the authorization code for tokens via our Supabase Edge Function
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oauth-exchange`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${(await db.auth.getSession()).data.session?.access_token}`,
            },
            body: JSON.stringify({ platform: platformParam, code }),
          }
        )

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Token exchange failed' }))
          throw new Error(err.error || `Exchange failed with status ${response.status}`)
        }

        const result = await response.json()

        // Save the connection to the database
        const { error: insertError } = await db.from('platform_connections').upsert(
          {
            user_id: user.id,
            platform: platformParam,
            access_token: result.access_token,
            refresh_token: result.refresh_token || null,
            account_id: result.account_id || result.user_id || `${platformParam}_${Date.now()}`,
            account_name: result.account_name || result.username || `@${platformParam}_user`,
            account_avatar: result.account_avatar || null,
            expires_at: result.expires_at || result.expires_in
              ? new Date(Date.now() + (result.expires_in || 3600) * 1000).toISOString()
              : null,
            is_active: true,
            provider: 'direct',
          },
          { onConflict: 'user_id, platform' }
        )

        if (insertError) throw insertError

        if (cancelled) return
        setAccountName(result.account_name || result.username || platformParam)
        setState('success')

        // Redirect back to settings after a short delay
        timerRef.current = setTimeout(() => navigate('/settings'), 2000)
      } catch (err: unknown) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Failed to exchange authorization code'
        setErrorMessage(message)
        setState('error')
      }
    }

    handleCallback()

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [searchParams, user, navigate])

  const PLATFORM_NAMES: Record<string, string> = {
    tiktok: 'TikTok',
    instagram: 'Instagram',
    youtube: 'YouTube',
    twitter: 'X / Twitter',
    linkedin: 'LinkedIn',
    facebook: 'Facebook',
    pinterest: 'Pinterest',
    snapchat: 'Snapchat',
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#080B0F', padding: 24,
    }}>
      <div style={{
        maxWidth: 420, width: '100%', textAlign: 'center',
        background: '#0D1117', border: '1px solid #1E2A36',
        borderRadius: 16, padding: '40px 32px',
      }}>
        {state === 'loading' && (
          <>
            <div style={{ marginBottom: 24 }}>
              {isZernio ? (
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'linear-gradient(135deg, #00E5A0, #00B4D8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto',
                }}>
                  <Link2 size={24} color="#080B0F" style={{ animation: 'pulse-glow 1.5s ease-in-out infinite' }} />
                </div>
              ) : (
                <Loader2 size={40} color="#00E5A0" style={{ animation: 'spin 1s linear infinite' }} />
              )}
            </div>
            <h2 style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 700, color: '#F0F4F8', marginBottom: 8 }}>
              {isZernio ? 'Connecting via Zernio' : `Connecting to ${PLATFORM_NAMES[platform] || platform}`}
            </h2>
            <p style={{ color: '#8B9EB0', fontSize: 13, lineHeight: 1.5 }}>
              {isZernio
                ? 'Zernio is authorizing your platforms — TikTok, Instagram, YouTube, X, LinkedIn, Facebook, Pinterest, and Snapchat…'
                : 'Exchanging authorization code for access tokens…'
              }
            </p>
          </>
        )}

        {state === 'success' && (
          <>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(0,229,160,0.12)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <Check size={28} color="#00E5A0" />
            </div>
            <h2 style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 700, color: '#F0F4F8', marginBottom: 8 }}>
              {isZernio ? 'Platforms Connected!' : 'Connected!'}
            </h2>
            <p style={{ color: '#8B9EB0', fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
              {isZernio
                ? `${platform} linked via Zernio${accountName ? `: ${accountName}` : ''}`
                : `${PLATFORM_NAMES[platform] || platform} ${accountName ? `(@${accountName})` : ''} has been linked to your Virlo account.`
              }
            </p>
            {isZernio && (
              <p style={{ color: '#00B4D8', fontSize: 12, marginBottom: 16, fontFamily: 'JetBrains Mono' }}>
                Powered by Zernio — all tokens managed automatically
              </p>
            )}
            <p style={{ color: '#4A5E70', fontSize: 12 }}>
              Redirecting to settings…
            </p>
          </>
        )}

        {state === 'error' && (
          <>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(255,71,87,0.12)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <X size={28} color="#FF4757" />
            </div>
            <h2 style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 700, color: '#F0F4F8', marginBottom: 8 }}>
              Connection failed
            </h2>
            <p style={{ color: '#8B9EB0', fontSize: 13, lineHeight: 1.5, marginBottom: 20 }}>
              {errorMessage}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => navigate('/settings')} className="btn-secondary" style={{ fontSize: 13, padding: '8px 18px' }}>
                Back to settings
              </button>
              <button onClick={() => navigate('/settings')} className="btn-primary" style={{ fontSize: 13, padding: '8px 18px' }}>
                Try again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
