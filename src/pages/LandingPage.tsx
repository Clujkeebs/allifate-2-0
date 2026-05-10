import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, ArrowRight, Play, Brain, Film, Mic, Zap, Smartphone, Image, BarChart3, CheckCircle, TrendingUp, Users, Globe, Zap as ZapIcon, Wand2 } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { PLATFORMS, SUBSCRIPTION_PLANS } from '@/constants/platforms'

const DEMO_PROMPTS = [
  'Deep Reddit story about a glitch in the matrix',
  'Motivational quotes for early morning entrepreneurs',
  'Scary urban legend about a haunted forest',
  '3 wealth-building tips for 20-year olds',
  'Mind-blowing facts about the deep ocean',
]

const PIPELINE_STAGES = [
  { label: 'Strategy AI', icon: <Brain size={15} />, desc: 'Crafting viral hooks & high-retention scripts' },
  { label: 'AI Voiceover', icon: <Mic size={15} />, desc: 'ElevenLabs-powered human narration' },
  { label: 'Media Engine', icon: <Wand2 size={15} />, desc: 'Generating 4K cinematic visuals for every scene' },
  { label: 'Video Rendering', icon: <Zap size={15} />, desc: 'Burning captions & syncing audio tracks' },
  { label: 'Platform Adaptation', icon: <Smartphone size={15} />, desc: 'Exporting native versions for TikTok, IG, & YT' },
]

const STATS = [
  { value: '24/7', label: 'Autopilot Posting' },
  { value: '11Labs', label: 'Premium Voice' },
  { value: '4K', label: 'AI Visuals' },
  { value: '10x', label: 'Engagement lift' },
]

const SOCIAL_PROOF = [
  { icon: <TrendingUp size={22} color="#00E5A0" />, stat: '90%', label: 'Retention rate', desc: 'Hooks designed to keep viewers watching until the very end.' },
  { icon: <Users size={22} color="#00B4D8" />, stat: '10k+', label: 'Reels generated', desc: 'Join thousands of creators automating their faceless channels.' },
  { icon: <Globe size={22} color="#FFB547" />, stat: '∞', label: 'Infinite Niche', desc: 'From Reddit stories to Finance — we handle every niche.' },
  { icon: <ZapIcon size={22} color="#e1306c" />, stat: '<2m', label: 'Render time', desc: 'Blazing fast server-side rendering with animated captions.' },
]

function TypingPrompt() {
  const [promptIdx, setPromptIdx] = useState(0)
  const [text, setText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const target = DEMO_PROMPTS[promptIdx]
    if (!isDeleting && text === target) {
      const t = setTimeout(() => setIsDeleting(true), 2600)
      return () => clearTimeout(t)
    }
    if (isDeleting && text === '') {
      const to = setTimeout(() => {
        setIsDeleting(false)
        setPromptIdx(i => (i + 1) % DEMO_PROMPTS.length)
      }, 0)
      return () => clearTimeout(to)
    }
    const t = setTimeout(() => {
      setText(isDeleting ? text.slice(0, -1) : target.slice(0, text.length + 1))
    }, isDeleting ? 22 : 48)
    return () => clearTimeout(t)
  }, [text, isDeleting, promptIdx])

  return (
    <span style={{ color: '#ECF0F4', fontFamily: 'DM Sans', fontSize: 15, lineHeight: 1.6 }}>
      {text}
      <span style={{
        display: 'inline-block',
        width: 2,
        height: '1em',
        background: '#00E5A0',
        marginLeft: 2,
        verticalAlign: 'text-bottom',
        animation: 'typewriter-cursor 0.9s step-end infinite',
      }} />
    </span>
  )
}

function PipelineDemo() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActive(a => (a + 1) % PIPELINE_STAGES.length), 2000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ padding: '12px 0' }}>
      {PIPELINE_STAGES.map((stage, i) => (
        <div key={stage.label} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '9px 16px',
          borderRadius: 10,
          background: i === active ? 'rgba(0,229,160,0.06)' : 'transparent',
          border: `1px solid ${i === active ? 'rgba(0,229,160,0.18)' : 'transparent'}`,
          marginBottom: 4,
          transition: 'all 0.35s ease',
          opacity: i > active ? 0.35 : 1,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: i < active ? 'linear-gradient(135deg,#00E5A0,#00C896)'
              : i === active ? 'rgba(0,229,160,0.12)' : '#141B23',
            border: `1px solid ${i <= active ? 'rgba(0,229,160,0.4)' : '#1A2530'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: i < active ? 13 : 15, flexShrink: 0,
            transition: 'all 0.35s',
          }}>
            {i < active ? <Check size={14} color="#00E5A0" /> : stage.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 12, fontFamily: 'Syne', fontWeight: 700,
              color: i === active ? '#ECF0F4' : i < active ? '#7A8FA0' : '#3A5060',
              letterSpacing: '-0.01em',
            }}>
              {stage.label}
            </div>
            {i === active && (
              <div style={{ fontSize: 10, color: '#7A8FA0', marginTop: 1, fontFamily: 'DM Sans' }}>
                {stage.desc}
              </div>
            )}
          </div>
          {i === active && (
            <div style={{ display: 'flex', gap: 3 }}>
              {[0, 1, 2].map(d => (
                <div key={d} style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: '#00E5A0',
                  animation: `dot-bounce 1.2s ease infinite`,
                  animationDelay: `${d * 0.15}s`,
                }} />
              ))}
            </div>
          )}
          {i < active && (
            <span style={{ fontSize: 10, color: '#00E5A0', fontFamily: 'JetBrains Mono', fontWeight: 700 }}><Check size={10} /></span>
          )}
        </div>
      ))}
    </div>
  )
}

export function LandingPage() {
  const [annual, setAnnual] = useState(false)
  const navigate = useNavigate()

  return (
    <div style={{ background: '#060A0E', minHeight: '100vh', overflowX: 'hidden', color: '#ECF0F4' }}>

      {/* ── Nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(6,10,14,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px', height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo size="sm" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <a href="#features" style={{ color: '#7A8FA0', fontSize: 14, fontFamily: 'DM Sans', transition: 'color 0.15s' }} onMouseEnter={e => (e.target as HTMLElement).style.color = '#C4D4E0'} onMouseLeave={e => (e.target as HTMLElement).style.color = '#7A8FA0'}>Features</a>
            <a href="#platforms" style={{ color: '#7A8FA0', fontSize: 14, fontFamily: 'DM Sans', transition: 'color 0.15s' }} onMouseEnter={e => (e.target as HTMLElement).style.color = '#C4D4E0'} onMouseLeave={e => (e.target as HTMLElement).style.color = '#7A8FA0'}>Platforms</a>
            <a href="#pricing" style={{ color: '#7A8FA0', fontSize: 14, fontFamily: 'DM Sans', transition: 'color 0.15s' }} onMouseEnter={e => (e.target as HTMLElement).style.color = '#C4D4E0'} onMouseLeave={e => (e.target as HTMLElement).style.color = '#7A8FA0'}>Pricing</a>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link to="/auth">
              <button style={{
                background: 'transparent', border: '1px solid #1A2530', borderRadius: 8,
                padding: '7px 16px', color: '#7A8FA0', fontSize: 13, cursor: 'pointer',
                fontFamily: 'DM Sans', transition: 'all 0.15s',
              }}>
                Sign in
              </button>
            </Link>
            <Link to="/auth?mode=signup">
              <button className="btn-primary" style={{ fontSize: 13, padding: '7px 18px', borderRadius: 8 }}>
                Get started
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', padding: '96px 24px 80px', textAlign: 'center', overflow: 'hidden' }}>
        {/* Glow orbs — vivid */}
        <div className="hero-glow-center" />
        <div className="hero-glow-right" />
        <div className="hero-glow-left" />

        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse 70% 80% at 50% 40%, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 80% at 50% 40%, black 30%, transparent 80%)',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 860, margin: '0 auto' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'rgba(0,229,160,0.07)', border: '1px solid rgba(0,229,160,0.2)',
            borderRadius: 100, padding: '5px 14px 5px 10px', marginBottom: 32,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E5A0', boxShadow: '0 0 8px #00E5A0', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#00E5A0', fontFamily: 'JetBrains Mono', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              AI Content Engine — Now live
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: 'Syne',
            fontSize: 'clamp(44px, 7.5vw, 88px)',
            fontWeight: 800,
            lineHeight: 0.97,
            letterSpacing: '-0.035em',
            color: '#ECF0F4',
            marginBottom: 24,
          }}>
            Faceless Reels.<br />
            <span style={{
              background: 'linear-gradient(135deg, #00E5A0 0%, #00C8FF 55%, #00E5A0 100%)',
              backgroundSize: '200% 200%',
              animation: 'gradient-shift 5s ease infinite',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Fully Automated.
            </span><br />
            Zero Effort.
          </h1>

          <p style={{ fontSize: 18, color: '#7A8FA0', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.7, fontFamily: 'DM Sans' }}>
            Scale your faceless channels to millions of views. Our AI writes, narrates, and renders viral Reels across TikTok, Instagram, and YouTube — 24/7 on autopilot.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 56 }}>
            <button onClick={() => navigate('/auth?mode=signup')} className="btn-primary" style={{ fontSize: 15, padding: '13px 28px', borderRadius: 10 }}>
              Start for free <ArrowRight size={16} />
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('demo')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
              className="btn-secondary"
              style={{ fontSize: 15, padding: '13px 22px', borderRadius: 10 }}
            >
              <Play size={15} fill="currentColor" /> Watch demo
            </button>
          </div>

          {/* Hero demo cards */}
          <div id="demo" style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
            maxWidth: 820, margin: '0 auto', textAlign: 'left',
          }}>
            {/* Prompt card */}
            <div style={{
              background: '#0D1117',
              border: '1px solid #1A2530',
              borderRadius: 16,
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '12px 16px', borderBottom: '1px solid #1A2530',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  {['#FF5F57', '#FFBD2E', '#28C840'].map(c => (
                    <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.8 }} />
                  ))}
                </div>
                <span style={{ fontSize: 11, color: '#3A5060', fontFamily: 'JetBrains Mono', marginLeft: 4 }}>virlo — prompt</span>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ fontSize: 11, color: '#3A5060', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                  Your prompt
                </div>
                <div style={{ minHeight: 72 }}>
                  <TypingPrompt />
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
                  {PLATFORMS.slice(0, 5).map(p => (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: '#141B23', border: '1px solid #1A2530',
                      borderRadius: 20, padding: '3px 8px', fontSize: 10,
                      color: '#7A8FA0', fontFamily: 'DM Sans',
                    }}>
                      <span style={{ fontSize: 12 }}>{p.icon}</span>
                      {p.name}
                    </div>
                  ))}
                  <div style={{
                    background: '#141B23', border: '1px solid #1A2530',
                    borderRadius: 20, padding: '3px 8px', fontSize: 10, color: '#7A8FA0',
                  }}>
                    +3
                  </div>
                </div>
              </div>
            </div>

            {/* Pipeline card */}
            <div style={{
              background: '#0D1117',
              border: '1px solid rgba(0,229,160,0.2)',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 0 40px -10px rgba(0,229,160,0.12)',
            }}>
              <div style={{
                padding: '12px 16px', borderBottom: '1px solid #1A2530',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E5A0', boxShadow: '0 0 6px #00E5A0' }} />
                  <span style={{ fontSize: 11, color: '#00E5A0', fontFamily: 'JetBrains Mono', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    AI Pipeline
                  </span>
                </div>
                <span style={{ fontSize: 10, color: '#3A5060', fontFamily: 'JetBrains Mono' }}>LIVE</span>
              </div>
              <PipelineDemo />
            </div>
          </div>

          <p style={{ fontSize: 12, color: '#3A5060', marginTop: 20, fontFamily: 'DM Sans' }}>
            No credit card required · 7-day free trial · Cancel anytime
          </p>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <div style={{ borderTop: '1px solid #1A2530', borderBottom: '1px solid #1A2530', background: '#0D1117' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {STATS.map((s, i) => (
            <div key={s.label} style={{
              padding: '28px 24px', textAlign: 'center',
              borderRight: i < 3 ? '1px solid #1A2530' : 'none',
            }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 36, color: '#ECF0F4', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 13, color: '#7A8FA0', marginTop: 6, fontFamily: 'DM Sans' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Platform strip ── */}
      <section id="platforms" style={{ padding: '72px 0', overflow: 'hidden' }}>
        <div style={{ textAlign: 'center', marginBottom: 36, padding: '0 24px' }}>
          <div style={{ fontSize: 11, color: '#3A5060', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Native integrations
          </div>
          <h2 style={{ fontFamily: 'Syne', fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 700, color: '#ECF0F4', letterSpacing: '-0.02em' }}>
            Every major platform. One workflow.
          </h2>
        </div>
        {/* Scrolling marquee */}
        <div style={{ overflow: 'hidden', position: 'relative' }}>
          <div style={{ display: 'flex', maskImage: 'linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)' }}>
            <div className="marquee-track" style={{ gap: 16, padding: '0 8px' }}>
              {[...PLATFORMS, ...PLATFORMS].map((p, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 20px',
                  background: '#0D1117', border: '1px solid #1A2530', borderRadius: 12,
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: p.bgColor, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 18, flexShrink: 0,
                  }}>
                    {p.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#ECF0F4', fontFamily: 'Syne' }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: '#7A8FA0', fontFamily: 'JetBrains Mono', marginTop: 1 }}>{p.formats[0]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ maxWidth: 1160, margin: '0 auto', padding: '40px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 11, color: '#3A5060', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            The Faceless Engine
          </div>
          <h2 style={{ fontFamily: 'Syne', fontSize: 'clamp(26px, 3.5vw, 42px)', fontWeight: 700, color: '#ECF0F4', letterSpacing: '-0.02em', marginBottom: 12 }}>
            Your entire production team in one AI
          </h2>
          <p style={{ color: '#7A8FA0', fontSize: 16, maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
            Not just templates. A complete end-to-end pipeline that builds real, viral faceless content from scratch.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            {
              icon: <Brain size={22} />, color: '#00E5A0', bg: 'rgba(0,229,160,0.1)',
              title: 'Viral Strategy AI',
              desc: 'Our AI analyzes trending Reddit threads, motivational hooks, and news patterns to script content that is mathematically designed to go viral.',
            },
            {
              icon: <Mic size={22} />, color: '#FFB547', bg: 'rgba(255,181,71,0.1)',
              title: 'Premium Voice Narration',
              desc: 'Integrated with ElevenLabs. Get human-like, deep, emotional, or high-energy voices that viewers actually want to listen to.',
            },
            {
              icon: <Wand2 size={22} />, color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)',
              title: '4K AI Visual Generation',
              desc: 'Generate original cinematic visuals with Flux and DALL-E 3. AI creates consistent, high-quality images for every single scene in your script.',
            },
            {
              icon: <Zap size={22} />, color: '#00B4D8', bg: 'rgba(0,180,216,0.1)',
              title: 'Auto-Animated Captions',
              desc: 'Hormozi-style animated captions burned directly into the video. High retention, perfectly synced, and optimized for silent viewers.',
            },
            {
              icon: <Image size={22} />, color: '#e1306c', bg: 'rgba(225,48,108,0.1)',
              title: 'Reddit & Story Modes',
              desc: 'One-click Reddit story generation. Just paste a link and we handle the narration, background parkour footage, and subtitles.',
            },
            {
              icon: <BarChart3 size={22} />, color: '#FFB547', bg: 'rgba(255,181,71,0.1)',
              title: 'Monetization Optimized',
              desc: 'Built specifically for creators looking to make money. Optimized for affiliate links, sponsorships, and creator fund requirements.',
            },
          ].map(f => (
            <div key={f.title} className="card card-hover" style={{ padding: 24, borderRadius: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: f.bg, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 22, marginBottom: 16, flexShrink: 0,
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 700, color: '#ECF0F4', marginBottom: 8, letterSpacing: '-0.01em' }}>
                {f.title}
              </h3>
              <p style={{ color: '#7A8FA0', fontSize: 13, lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ borderTop: '1px solid #1A2530', background: '#0D1117', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 11, color: '#3A5060', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Pricing
            </div>
            <h2 style={{ fontFamily: 'Syne', fontSize: 'clamp(26px, 3.5vw, 42px)', fontWeight: 700, color: '#ECF0F4', letterSpacing: '-0.02em', marginBottom: 10 }}>
              Simple, transparent pricing
            </h2>
            <p style={{ color: '#7A8FA0', fontSize: 15, marginBottom: 28 }}>7-day free trial on all plans. No credit card required.</p>
            {/* Toggle */}
            <div style={{ display: 'inline-flex', background: '#141B23', border: '1px solid #1A2530', borderRadius: 10, padding: 4, gap: 2 }}>
              <button
                onClick={() => setAnnual(false)}
                style={{
                  padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: !annual ? '#0D1117' : 'transparent',
                  color: !annual ? '#ECF0F4' : '#7A8FA0',
                  fontSize: 13, fontFamily: 'Syne', fontWeight: 600,
                  boxShadow: !annual ? '0 1px 4px rgba(0,0,0,0.5)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                style={{
                  padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: annual ? '#0D1117' : 'transparent',
                  color: annual ? '#ECF0F4' : '#7A8FA0',
                  fontSize: 13, fontFamily: 'Syne', fontWeight: 600,
                  boxShadow: annual ? '0 1px 4px rgba(0,0,0,0.5)' : 'none',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                Annual <span style={{ background: 'rgba(0,229,160,0.15)', color: '#00E5A0', fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>–17%</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {SUBSCRIPTION_PLANS.map(plan => (
              <div key={plan.id} style={{
                background: plan.popular ? 'linear-gradient(160deg, rgba(0,229,160,0.07), rgba(0,180,216,0.04) 60%, #060A0E)' : '#060A0E',
                border: `1px solid ${plan.popular ? 'rgba(0,229,160,0.3)' : '#1A2530'}`,
                borderRadius: 16, padding: '28px 24px',
                position: 'relative',
                boxShadow: plan.popular ? '0 0 60px -20px rgba(0,229,160,0.2)' : 'none',
              }}>
                {plan.popular && (
                  <div style={{
                    position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #00E5A0, #00C896)',
                    color: '#060A0E', fontSize: 11, fontWeight: 800,
                    padding: '4px 16px', borderRadius: 100, fontFamily: 'Syne',
                    whiteSpace: 'nowrap', letterSpacing: '0.03em',
                  }}>
                    MOST POPULAR
                  </div>
                )}
                <div style={{ fontSize: 12, color: '#7A8FA0', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  {plan.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'Syne', fontSize: 48, fontWeight: 800, color: '#ECF0F4', letterSpacing: '-0.04em', lineHeight: 1 }}>
                    ${annual ? Math.floor(plan.annualPrice / 12) : plan.price}
                  </span>
                  <span style={{ fontSize: 14, color: '#7A8FA0' }}>/mo</span>
                </div>
                {annual && (
                  <div style={{ fontSize: 12, color: '#00E5A0', marginBottom: 4 }}>
                    Billed ${plan.annualPrice}/year
                  </div>
                )}
                <div style={{ height: 1, background: '#1A2530', margin: '20px 0' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13, color: '#7A8FA0', lineHeight: 1.4 }}>
                      <Check size={13} color="#00E5A0" style={{ flexShrink: 0, marginTop: 2 }} />
                      {f}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate('/auth?mode=signup')}
                  className={plan.popular ? 'btn-primary' : 'btn-secondary'}
                  style={{ width: '100%', justifyContent: 'center', fontSize: 14, borderRadius: 10 }}
                >
                  Start free trial
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Proof ── */}
      <section style={{ borderTop: '1px solid #1A2530', background: '#0D1117', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 11, color: '#3A5060', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Trusted by creators
            </div>
            <h2 style={{ fontFamily: 'Syne', fontSize: 'clamp(26px, 3.5vw, 42px)', fontWeight: 700, color: '#ECF0F4', letterSpacing: '-0.02em', marginBottom: 10 }}>
              Built for scale
            </h2>
            <p style={{ color: '#7A8FA0', fontSize: 15, maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>
              Virlo powers content creation for hundreds of creators and brands across every major platform.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {SOCIAL_PROOF.map(item => (
              <div key={item.label} className="card" style={{ padding: 28, borderRadius: 16, textAlign: 'center' }}>
                <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>{item.icon}</div>
                <div style={{ fontFamily: 'Syne', fontSize: 32, fontWeight: 800, color: '#ECF0F4', marginBottom: 4 }}>{item.stat}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#F0F4F8', fontFamily: 'Syne', marginBottom: 8 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: '#7A8FA0', lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '100px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600, height: 400,
          background: 'radial-gradient(ellipse, rgba(0,229,160,0.1) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontFamily: 'Syne', fontSize: 'clamp(28px, 5vw, 54px)', fontWeight: 800, color: '#ECF0F4', letterSpacing: '-0.03em', marginBottom: 16 }}>
            Your competition is already using AI.
          </h2>
          <p style={{ color: '#7A8FA0', fontSize: 17, marginBottom: 36, maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.6 }}>
            Start creating content that actually performs. No design skills, no video editing, no team required.
          </p>
          <button onClick={() => navigate('/auth?mode=signup')} className="btn-primary" style={{ fontSize: 16, padding: '14px 36px', borderRadius: 12 }}>
            Get started free <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid #1A2530', background: '#060A0E', padding: '40px 24px 32px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 32 }}>
          <div>
            <Logo size="sm" />
            <p style={{ color: '#7A8FA0', fontSize: 13, marginTop: 12, lineHeight: 1.6, maxWidth: 280 }}>
              AI content engine that writes, renders, and schedules platform-native content across all 8 major social platforms.
            </p>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#ECF0F4', fontFamily: 'Syne', marginBottom: 12 }}>Product</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[{ label: 'Features', href: '#features' }, { label: 'Platforms', href: '#platforms' }, { label: 'Pricing', href: '#pricing' }].map(l => (
                <a key={l.label} href={l.href} style={{ color: '#7A8FA0', fontSize: 13, fontFamily: 'DM Sans', transition: 'color 0.15s' }} onMouseEnter={e => (e.target as HTMLElement).style.color = '#ECF0F4'} onMouseLeave={e => (e.target as HTMLElement).style.color = '#7A8FA0'}>{l.label}</a>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#ECF0F4', fontFamily: 'Syne', marginBottom: 12 }}>Company</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link to="/privacy" style={{ color: '#7A8FA0', fontSize: 13, fontFamily: 'DM Sans' }}>Privacy</Link>
              <Link to="/terms" style={{ color: '#7A8FA0', fontSize: 13, fontFamily: 'DM Sans' }}>Terms</Link>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#ECF0F4', fontFamily: 'Syne', marginBottom: 12 }}>Support</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href="mailto:hello@virlo.ai" style={{ color: '#7A8FA0', fontSize: 13, fontFamily: 'DM Sans' }}>hello@virlo.ai</a>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 1160, margin: '0 auto', borderTop: '1px solid #1A2530', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>            <p style={{ color: '#3A5060', fontSize: 12, margin: 0, fontFamily: 'DM Sans' }}>
            © 2026 Virlo · Built with Claude + AI Image Gen
          </p>
        </div>
      </footer>
    </div>
  )
}
