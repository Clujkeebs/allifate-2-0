import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronRight, Loader2 } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { PLATFORMS, NICHES, TONES } from '@/constants/platforms'
import { db } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Platform } from '@/types/database'

const STEPS = ['Account', 'Connect', 'Your Niche', 'First Post']

export function OnboardingPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [name, setName] = useState(profile?.full_name || '')
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([])
  const [niche, setNiche] = useState('')
  const [tone, setTone] = useState('')
  const [saving, setSaving] = useState(false)

  function togglePlatform(id: Platform) {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  async function finishOnboarding() {
    if (!user) return
    setSaving(true)
    await db.from('profiles').upsert({
      id: user.id,
      full_name: name,
      niche,
      tone_preference: tone,
    })
    setSaving(false)
    navigate('/create')
  }

  const canNext = [
    name.length > 0,
    selectedPlatforms.length > 0,
    niche.length > 0 && tone.length > 0,
    true,
  ][step]

  return (
    <div style={{ minHeight: '100vh', background: '#080B0F', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px' }}>
      <div style={{ position: 'fixed', top: '10%', left: '30%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(0,229,160,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Logo */}
      <div style={{ marginBottom: 40 }}><Logo size="md" /></div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 40 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: i < step ? '#00E5A0' : i === step ? 'rgba(0,229,160,0.2)' : '#1E2A36',
                border: `2px solid ${i <= step ? '#00E5A0' : '#1E2A36'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: i < step ? '#080B0F' : i === step ? '#00E5A0' : '#4A5E70',
                fontSize: 12, fontWeight: 700, fontFamily: 'JetBrains Mono',
                transition: 'all 0.3s',
              }}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span style={{ fontSize: 11, color: i === step ? '#F0F4F8' : '#4A5E70', whiteSpace: 'nowrap' }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ width: 60, height: 2, background: i < step ? '#00E5A0' : '#1E2A36', margin: '0 4px', marginBottom: 20, transition: 'background 0.3s' }} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div style={{ width: '100%', maxWidth: 560, background: '#0F1318', border: '1px solid #1E2A36', borderRadius: 16, padding: 32 }}>
        {step === 0 && (
          <div className="animate-slide-up">
            <h2 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 700, color: '#F0F4F8', marginBottom: 8 }}>What should we call you?</h2>
            <p style={{ color: '#8B9EB0', fontSize: 14, marginBottom: 24 }}>This will appear on your profile and in AI-generated content briefs.</p>
            <input className="input-base" placeholder="Your full name or brand name" value={name} onChange={e => setName(e.target.value)} style={{ fontSize: 16 }} />
          </div>
        )}

        {step === 1 && (
          <div className="animate-slide-up">
            <h2 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 700, color: '#F0F4F8', marginBottom: 8 }}>Connect your platforms</h2>
            <p style={{ color: '#8B9EB0', fontSize: 14, marginBottom: 24 }}>Select where you want to publish. You can connect OAuth later in settings.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {PLATFORMS.map(p => {
                const selected = selectedPlatforms.includes(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    style={{
                      background: selected ? `rgba(${p.color === '#00E5A0' ? '0,229,160' : '15,19,24'}, 0.15)` : '#161C24',
                      border: `1px solid ${selected ? p.color : '#1E2A36'}`,
                      borderRadius: 10,
                      padding: '12px 14px',
                      display: 'flex', alignItems: 'center', gap: 10,
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{p.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: selected ? '#F0F4F8' : '#8B9EB0', fontFamily: 'Syne' }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: '#4A5E70', fontFamily: 'JetBrains Mono' }}>{p.formats[0]}</div>
                    </div>
                    {selected && <Check size={14} color="#00E5A0" style={{ marginLeft: 'auto' }} />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-slide-up">
            <h2 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 700, color: '#F0F4F8', marginBottom: 8 }}>Your content niche & tone</h2>
            <p style={{ color: '#8B9EB0', fontSize: 14, marginBottom: 20 }}>This shapes every piece of AI-generated content you produce.</p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#8B9EB0', display: 'block', marginBottom: 8 }}>Niche</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {NICHES.map(n => (
                  <button key={n} onClick={() => setNiche(n)} style={{ padding: '6px 12px', borderRadius: 20, border: `1px solid ${niche === n ? '#00E5A0' : '#1E2A36'}`, background: niche === n ? 'rgba(0,229,160,0.1)' : 'transparent', color: niche === n ? '#00E5A0' : '#8B9EB0', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans' }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#8B9EB0', display: 'block', marginBottom: 8 }}>Tone</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {TONES.map(t => (
                  <button key={t.id} onClick={() => setTone(t.id)} style={{ padding: '12px 14px', borderRadius: 10, border: `1px solid ${tone === t.id ? '#00E5A0' : '#1E2A36'}`, background: tone === t.id ? 'rgba(0,229,160,0.06)' : '#161C24', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: tone === t.id ? '#00E5A0' : '#F0F4F8', fontFamily: 'Syne' }}>{t.label}</div>
                      <div style={{ fontSize: 12, color: '#8B9EB0' }}>{t.desc}</div>
                    </div>
                    {tone === t.id && <Check size={14} color="#00E5A0" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-slide-up" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🚀</div>
            <h2 style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 700, color: '#F0F4F8', marginBottom: 12 }}>You're all set!</h2>
            <p style={{ color: '#8B9EB0', fontSize: 15, marginBottom: 24, lineHeight: 1.6 }}>
              Your AI content engine is ready. Type a prompt and watch SocialMind turn it into polished, platform-native content in under 3 minutes.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {selectedPlatforms.map(id => (
                <span key={id} style={{ fontSize: 24 }}>{PLATFORMS.find(p => p.id === id)?.icon}</span>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, paddingTop: 20, borderTop: '1px solid #1E2A36' }}>
          <button
            onClick={() => setStep(s => s - 1)}
            className="btn-secondary"
            style={{ visibility: step === 0 ? 'hidden' : 'visible' }}
          >
            Back
          </button>
          <button
            onClick={() => step < STEPS.length - 1 ? setStep(s => s + 1) : finishOnboarding()}
            disabled={!canNext || saving}
            className="btn-primary"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {step === STEPS.length - 1 ? 'Start Creating' : 'Continue'}
            {step < STEPS.length - 1 && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}
