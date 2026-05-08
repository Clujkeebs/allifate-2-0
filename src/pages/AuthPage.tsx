import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/ui/Logo'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

type Mode = 'login' | 'signup'

export function AuthPage({ mode: initialMode = 'login' }: { mode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      })
      if (error) { setError(error.message); setLoading(false); return }
      setSuccess('Check your email to confirm your account!')
      setLoading(false)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      navigate('/dashboard')
    }
  }

  async function handleGoogle() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080B0F', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      {/* Background glow */}
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(0,229,160,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ display: 'inline-block', marginBottom: 24 }}>
            <Logo size="md" showTagline />
          </Link>
          <h1 style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 700, color: '#F0F4F8', margin: '0 0 8px' }}>
            {mode === 'login' ? 'Welcome back' : 'Start creating'}
          </h1>
          <p style={{ color: '#8B9EB0', fontSize: 14, margin: 0 }}>
            {mode === 'login' ? 'Sign in to your SocialMind account' : 'Create your free account — no credit card required'}
          </p>
        </div>

        <div style={{ background: '#0F1318', border: '1px solid #1E2A36', borderRadius: 16, padding: 28 }}>
          {/* Google OAuth */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            style={{
              width: '100%',
              background: '#161C24',
              border: '1px solid #1E2A36',
              borderRadius: 8,
              padding: '10px 16px',
              color: '#F0F4F8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              fontSize: 14,
              fontFamily: 'DM Sans',
              cursor: 'pointer',
              marginBottom: 20,
              transition: 'border-color 0.2s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: '#1E2A36' }} />
            <span style={{ color: '#4A5E70', fontSize: 12 }}>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: '#1E2A36' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'signup' && (
              <div>
                <label style={{ fontSize: 12, color: '#8B9EB0', display: 'block', marginBottom: 6 }}>Full name</label>
                <input
                  className="input-base"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
            )}
            <div>
              <label style={{ fontSize: 12, color: '#8B9EB0', display: 'block', marginBottom: 6 }}>Email</label>
              <input
                className="input-base"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#8B9EB0', display: 'block', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input-base"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8B9EB0' }}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#FF4757' }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{ background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#00E5A0' }}>
                {success}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#8B9EB0' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null) }}
            style={{ background: 'none', border: 'none', color: '#00E5A0', cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans' }}
          >
            {mode === 'login' ? 'Sign up free' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
