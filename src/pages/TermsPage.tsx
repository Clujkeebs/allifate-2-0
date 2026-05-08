import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Scale, Shield, Zap, AlertCircle } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ color: '#00E5A0' }}>{icon}</div>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: '#F0F4F8', margin: 0 }}>
          {title}
        </h2>
      </div>
      <div style={{ color: '#8B9EB0', fontSize: 14, lineHeight: 1.8 }}>{children}</div>
    </div>
  )
}

export function TermsPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: '#060A0E', color: '#ECF0F4' }}>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(6,10,14,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '12px 24px',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo size="sm" />
          <button onClick={() => navigate(-1)} className="btn-ghost">
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px 80px' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ color: '#7A8FA0', fontSize: 14, marginBottom: 40 }}>Last updated: January 2026</p>

        <Section icon={<Scale size={18} />} title="Acceptance of Terms">
          <p>By accessing or using Virlo ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. We reserve the right to update these terms at any time with reasonable notice.</p>
        </Section>

        <Section icon={<Zap size={18} />} title="Service Description">
          <p>Virlo is an AI-powered content generation and scheduling platform. We generate social media content using artificial intelligence, provide scheduling tools, and offer analytics. Content is generated using Anthropic's Claude API and may vary in quality. Human review is recommended before publishing.</p>
        </Section>

        <Section icon={<Shield size={18} />} title="User Obligations">
          <ul style={{ paddingLeft: 20 }}>
            <li style={{ marginBottom: 8 }}>You must be at least 18 years old to use the Service.</li>
            <li style={{ marginBottom: 8 }}>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li style={{ marginBottom: 8 }}>You agree not to use the Service to generate illegal, harmful, or platform-violating content.</li>
            <li style={{ marginBottom: 8 }}>You are responsible for reviewing and approving all AI-generated content before publishing.</li>
            <li style={{ marginBottom: 8 }}>You agree to comply with the terms of service of each social media platform you connect to Virlo.</li>
            <li>You retain ownership of content you create, but grant us a license to process it for service delivery.</li>
          </ul>
        </Section>

        <Section icon={<Zap size={18} />} title="Subscriptions & Billing">
          <ul style={{ paddingLeft: 20 }}>
            <li style={{ marginBottom: 8 }}>Free trials are available on all plans. No credit card is required to start a trial.</li>
            <li style={{ marginBottom: 8 }}>Subscription fees are billed monthly or annually based on your selected plan.</li>
            <li style={{ marginBottom: 8 }}>Annual plans save 17% and are billed upfront. Prorated refunds available within 30 days.</li>
            <li style={{ marginBottom: 8 }}>Monthly plans can be canceled at any time. Access continues until the end of the billing period.</li>
            <li style={{ marginBottom: 8 }}>Post limits are reset at the start of each billing cycle.</li>
            <li>We reserve the right to change pricing with 30 days notice to active subscribers.</li>
          </ul>
        </Section>

        <Section icon={<AlertCircle size={18} />} title="Limitations of Liability">
          <p>Virlo provides AI-generated content "as is" without warranties of any kind. We are not liable for:</p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li style={{ marginBottom: 8 }}>Content that violates third-party platform policies or results in account actions</li>
            <li style={{ marginBottom: 8 }}>Factual inaccuracies in AI-generated content</li>
            <li style={{ marginBottom: 8 }}>Copyright claims arising from AI-generated content (see Fair Use Policy below)</li>
            <li style={{ marginBottom: 8 }}>Service interruptions or data loss beyond our reasonable control</li>
            <li>Indirect, incidental, or consequential damages</li>
          </ul>
        </Section>

        <Section icon={<Scale size={18} />} title="Fair Use & Content Policy">
          <p>Virlo's AI generates original content based on your prompts. While we use licensed stock media sources, you are responsible for ensuring your published content complies with each platform's guidelines and applicable laws. Excessive or abusive usage may result in service throttling or account review.</p>
        </Section>

        <Section icon={<Shield size={18} />} title="Termination">
          <p>We may suspend or terminate accounts that violate these terms. You may close your account at any time from Settings. Upon termination, your data will be retained for 30 days before permanent deletion, unless otherwise required by law.</p>
        </Section>

        <Section icon={<Zap size={18} />} title="Contact">
          <p>For questions about these terms, contact us at <a href="mailto:legal@virlo.ai" style={{ color: '#00E5A0' }}>legal@virlo.ai</a>.</p>
        </Section>
      </div>

      <footer style={{ borderTop: '1px solid #1A2530', padding: '24px', textAlign: 'center' }}>
        <p style={{ color: '#3A5060', fontSize: 12, margin: 0 }}>© 2026 Virlo · Built with Claude</p>
      </footer>
    </div>
  )
}
