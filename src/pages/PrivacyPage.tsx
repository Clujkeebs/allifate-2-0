import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, Lock, Eye, FileText, Scale } from 'lucide-react'
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

export function PrivacyPage() {
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
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: '#7A8FA0', fontSize: 14, marginBottom: 40 }}>Last updated: January 2026</p>

        <Section icon={<Shield size={18} />} title="Our Commitment to Privacy">
          <p>Virlo ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI content generation platform.</p>
        </Section>

        <Section icon={<Eye size={18} />} title="Information We Collect">
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#F0F4F8', margin: '16px 0 8px' }}>Account Information</h3>
          <p>When you create an account, we collect your name, email address, and authentication credentials. If you sign in with Google, we receive your name and email from Google's authentication service.</p>

          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#F0F4F8', margin: '16px 0 8px' }}>Content Data</h3>
          <p>We store the prompts you submit, the AI-generated content created for you, your brand preferences (niche, tone), and platform connection data. We also store assets you upload to our platform.</p>

          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#F0F4F8', margin: '16px 0 8px' }}>Usage Data</h3>
          <p>We collect information about how you use Virlo, including feature usage, generation counts, and platform publishing activity. This helps us improve our service and enforce fair usage limits.</p>
        </Section>

        <Section icon={<Lock size={18} />} title="How We Use Your Data">
          <ul style={{ paddingLeft: 20 }}>
            <li style={{ marginBottom: 8 }}>To provide, maintain, and improve our AI content generation services</li>
            <li style={{ marginBottom: 8 }}>To generate personalized content based on your niche, tone preferences, and brand settings</li>
            <li style={{ marginBottom: 8 }}>To process payments and manage your subscription through Stripe</li>
            <li style={{ marginBottom: 8 }}>To send you notifications about your content pipeline, account status, and product updates</li>
            <li style={{ marginBottom: 8 }}>To analyze usage patterns and improve our AI models and platform performance</li>
            <li>To comply with legal obligations and enforce our Terms of Service</li>
          </ul>
        </Section>

        <Section icon={<FileText size={18} />} title="Data Sharing & Third Parties">
          <p>We share your data only as necessary to provide our service:</p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li style={{ marginBottom: 8 }}><strong>Anthropic (Claude):</strong> Your prompts and brand preferences are sent to Claude for AI content generation. Anthropic does not train on your data per their API terms.</li>
            <li style={{ marginBottom: 8 }}><strong>Supabase:</strong> Your account, content, and analytics data is stored in Supabase's secure cloud infrastructure.</li>
            <li style={{ marginBottom: 8 }}><strong>Stripe:</strong> Payment information is processed by Stripe. We never store your full credit card details.</li>
            <li><strong>Platform APIs:</strong> When you publish content through connected social accounts, we send content through each platform's official API.</li>
          </ul>
          <p style={{ marginTop: 12 }}>We never sell your data. We never use your content to train AI models beyond generating content for you.</p>
        </Section>

        <Section icon={<Scale size={18} />} title="Your Rights">
          <p>You have the right to:</p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li style={{ marginBottom: 8 }}>Access all personal data we hold about you</li>
            <li style={{ marginBottom: 8 }}>Request correction or deletion of your data</li>
            <li style={{ marginBottom: 8 }}>Export your content and account data</li>
            <li style={{ marginBottom: 8 }}>Withdraw consent and close your account at any time</li>
            <li>Opt out of marketing communications</li>
          </ul>
        </Section>

        <Section icon={<Shield size={18} />} title="Security">
          <p>We implement industry-standard security measures including encryption at rest and in transit, regular security audits, and strict access controls. Your platform OAuth tokens are encrypted at rest. All API communications use TLS 1.3.</p>
        </Section>

        <Section icon={<FileText size={18} />} title="Contact">
          <p>For privacy-related inquiries, contact us at <a href="mailto:privacy@virlo.ai" style={{ color: '#00E5A0' }}>privacy@virlo.ai</a>.</p>
        </Section>
      </div>

      <footer style={{ borderTop: '1px solid #1A2530', padding: '24px', textAlign: 'center' }}>
        <p style={{ color: '#3A5060', fontSize: 12, margin: 0 }}>© 2026 Virlo · Built with Claude</p>
      </footer>
    </div>
  )
}
