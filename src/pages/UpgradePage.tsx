import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Check, Shield, Loader2, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { SUBSCRIPTION_PLANS } from '@/constants/platforms'

const STRIPE_PRICE_IDS: Record<string, { monthly: string; annual: string }> = {
  starter: { monthly: 'price_starter_monthly', annual: 'price_starter_annual' },
  pro: { monthly: 'price_pro_monthly', annual: 'price_pro_annual' },
  agency: { monthly: 'price_agency_monthly', annual: 'price_agency_annual' },
}

const FAQS = [
  {
    q: 'Can I switch plans anytime?',
    a: 'Yes! Upgrade or downgrade at any time. Changes take effect at the start of your next billing cycle. Annual plans include prorated adjustments.',
  },
  {
    q: 'Is there a free trial?',
    a: 'All plans come with a 7-day free trial. No credit card required to start. Cancel anytime before the trial ends and you won\'t be charged.',
  },
  {
    q: 'What counts as a "post"?',
    a: 'Each piece of content published to a single platform counts as one post. A single AI generation that produces 8 platform variants uses 1 generation credit, but posting all 8 counts as 8 posts.',
  },
  {
    q: 'Can I connect my own social accounts?',
    a: 'Yes — Virlo supports OAuth connections for TikTok, Instagram (via Meta), YouTube, Twitter/X, LinkedIn, Facebook, Pinterest, and Snapchat.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'We offer prorated refunds for annual plans canceled within 30 days of purchase. Monthly plans can be canceled at any time to stop future billing.',
  },
]

function PlanCard({
  plan,
  annual,
  currentTier,
  onSelect,
  loading,
}: {
  plan: (typeof SUBSCRIPTION_PLANS)[number]
  annual: boolean
  currentTier: string
  onSelect: (planId: string, annual: boolean) => void
  loading: boolean
}) {
  const isCurrent = currentTier === plan.id
  const price = annual ? Math.floor(plan.annualPrice / 12) : plan.price

  return (
    <div
      style={{
        background: plan.popular
          ? 'linear-gradient(160deg, rgba(0,229,160,0.07), rgba(0,180,216,0.04) 60%, #060A0E)'
          : '#060A0E',
        border: `1px solid ${plan.popular ? 'rgba(0,229,160,0.3)' : '#1A2530'}`,
        borderRadius: 16,
        padding: '32px 24px',
        position: 'relative',
        boxShadow: plan.popular ? '0 0 60px -20px rgba(0,229,160,0.2)' : 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {plan.popular && (
        <div
          style={{
            position: 'absolute',
            top: -13,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #00E5A0, #00C896)',
            color: '#060A0E',
            fontSize: 11,
            fontWeight: 800,
            padding: '4px 16px',
            borderRadius: 100,
            fontFamily: 'Syne, sans-serif',
            whiteSpace: 'nowrap',
            letterSpacing: '0.03em',
          }}
        >
          MOST POPULAR
        </div>
      )}

      <div
        style={{
          fontSize: 12,
          color: '#7A8FA0',
          fontFamily: 'JetBrains Mono, monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 8,
        }}
      >
        {plan.name}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
        <span
          style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 48,
            fontWeight: 800,
            color: '#ECF0F4',
            letterSpacing: '-0.04em',
            lineHeight: 1,
          }}
        >
          ${price}
        </span>
        <span style={{ fontSize: 14, color: '#7A8FA0' }}>/mo</span>
      </div>

      {annual && (
        <div style={{ fontSize: 12, color: '#00E5A0', marginBottom: 4 }}>
          Billed ${plan.annualPrice}/year
        </div>
      )}

      {isCurrent && (
        <div
          className="badge badge-accent"
          style={{ width: 'fit-content', marginBottom: 12 }}
        >
          YOUR PLAN
        </div>
      )}

      <div style={{ height: 1, background: '#1A2530', margin: '16px 0' }} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginBottom: 24,
          flex: 1,
        }}
      >
        {plan.features.map((f) => (
          <div
            key={f}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 9,
              fontSize: 13,
              color: '#7A8FA0',
              lineHeight: 1.4,
            }}
          >
            <Check size={13} color="#00E5A0" style={{ flexShrink: 0, marginTop: 2 }} />
            {f}
          </div>
        ))}
      </div>

      <button
        onClick={() => onSelect(plan.id, annual)}
        disabled={isCurrent || loading}
        className={plan.popular ? 'btn-primary' : 'btn-secondary'}
        style={{
          width: '100%',
          justifyContent: 'center',
          fontSize: 14,
          borderRadius: 10,
        }}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : isCurrent ? (
          'Current Plan'
        ) : (
          `Upgrade to ${plan.name}`
        )}
      </button>
    </div>
  )
}

export function UpgradePage() {
  const { user, subscription } = useAuth()
  const navigate = useNavigate()
  const [annual, setAnnual] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentTier = subscription?.tier || 'starter'

  async function handleCheckout(planId: string, isAnnual: boolean) {
    if (!user) {
      navigate('/auth')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const priceId = isAnnual
        ? STRIPE_PRICE_IDS[planId]?.annual
        : STRIPE_PRICE_IDS[planId]?.monthly

      if (!priceId) throw new Error('Invalid plan selected')

      // In production: hit your backend to create a Stripe Checkout session
      // For now, we show the production-ready UI and guide the user

      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ priceId, planId, userId: user.id, annual: isAnnual }),
      })

      if (res.status === 404) {
        // API route not yet deployed — redirect to Stripe directly
        setError('Payment service is temporarily unavailable. Please try again in a moment or contact support.')
        return
      }

      if (!res.ok) throw new Error(await res.text())

      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 28, maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <button
          onClick={() => navigate('/settings')}
          className="btn-ghost"
          style={{ marginBottom: 16 }}
        >
          <ArrowLeft size={14} /> Back to Settings
        </button>
        <h1
          style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 28,
            fontWeight: 700,
            color: '#F0F4F8',
            marginBottom: 8,
          }}
        >
          Upgrade your plan
        </h1>
        <p style={{ color: '#8B9EB0', fontSize: 15, lineHeight: 1.6, maxWidth: 560 }}>
          Scale your content output with more posts, more platforms, and more AI generation power.
          All plans include a 7-day free trial.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: 'rgba(255,71,87,0.1)',
            border: '1px solid rgba(255,71,87,0.2)',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 13,
            color: '#FF4757',
            marginBottom: 24,
          }}
        >
          {error}
        </div>
      )}

      {/* Toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
        <div
          style={{
            display: 'inline-flex',
            background: '#141B23',
            border: '1px solid #1A2530',
            borderRadius: 10,
            padding: 4,
            gap: 2,
          }}
        >
          <button
            onClick={() => setAnnual(false)}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              background: !annual ? '#0D1117' : 'transparent',
              color: !annual ? '#ECF0F4' : '#7A8FA0',
              fontSize: 14,
              fontFamily: 'Syne, sans-serif',
              fontWeight: 600,
              boxShadow: !annual ? '0 1px 4px rgba(0,0,0,0.5)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              background: annual ? '#0D1117' : 'transparent',
              color: annual ? '#ECF0F4' : '#7A8FA0',
              fontSize: 14,
              fontFamily: 'Syne, sans-serif',
              fontWeight: 600,
              boxShadow: annual ? '0 1px 4px rgba(0,0,0,0.5)' : 'none',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            Annual{' '}
            <span
              style={{
                background: 'rgba(0,229,160,0.15)',
                color: '#00E5A0',
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 10,
                fontWeight: 700,
              }}
            >
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {/* Plans grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 20,
          marginBottom: 60,
        }}
      >
        {SUBSCRIPTION_PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            annual={annual}
            currentTier={currentTier}
            onSelect={handleCheckout}
            loading={loading}
          />
        ))}
      </div>

      {/* Trust badges */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 40,
          marginBottom: 60,
          flexWrap: 'wrap',
        }}
      >
        {[
          { icon: <Shield size={16} />, label: '256-bit SSL encryption' },
          { icon: <Zap size={16} />, label: 'Cancel anytime' },
          { icon: <Check size={16} />, label: '7-day free trial' },
        ].map((badge) => (
          <div
            key={badge.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#7A8FA0',
              fontSize: 13,
            }}
          >
            <div style={{ color: '#00E5A0' }}>{badge.icon}</div>
            {badge.label}
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <h2
          style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 22,
            fontWeight: 700,
            color: '#F0F4F8',
            marginBottom: 24,
            textAlign: 'center',
          }}
        >
          Frequently asked questions
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FAQS.map((faq) => (
            <div
              key={faq.q}
              className="card"
              style={{ padding: '16px 20px' }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#F0F4F8',
                  fontFamily: 'Syne, sans-serif',
                  marginBottom: 6,
                }}
              >
                {faq.q}
              </div>
              <div style={{ fontSize: 13, color: '#8B9EB0', lineHeight: 1.6 }}>
                {faq.a}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div
        style={{
          textAlign: 'center',
          marginTop: 60,
          padding: '40px 24px',
          background: 'linear-gradient(135deg, rgba(0,229,160,0.04), rgba(0,180,216,0.02))',
          border: '1px solid rgba(0,229,160,0.1)',
          borderRadius: 16,
        }}
      >
        <h3
          style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 20,
            fontWeight: 700,
            color: '#F0F4F8',
            marginBottom: 8,
          }}
        >
          Not sure which plan is right?
        </h3>
        <p style={{ color: '#8B9EB0', fontSize: 14, marginBottom: 20 }}>
          Start with the free trial. Upgrade, downgrade, or cancel anytime.
        </p>
        <button
          onClick={() => navigate('/auth?mode=signup')}
          className="btn-primary"
          style={{ fontSize: 15, padding: '12px 28px', borderRadius: 10 }}
        >
          Start free trial <Zap size={15} />
        </button>
      </div>
    </div>
  )
}
