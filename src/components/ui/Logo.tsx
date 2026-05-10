interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showTagline?: boolean
}

export function Logo({ size = 'md', showTagline = false }: LogoProps) {
  const iconSize = size === 'sm' ? 28 : size === 'lg' ? 52 : 38
  const fontSize = size === 'sm' ? 17 : size === 'lg' ? 30 : 22

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size === 'sm' ? 8 : 10 }}>
      {/* Mark — stylized V lightning bolt */}
      <div style={{
        width: iconSize,
        height: iconSize,
        background: 'linear-gradient(135deg, #00E5A0 0%, #00B4D8 100%)',
        borderRadius: size === 'sm' ? 7 : 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 0 20px rgba(0,229,160,0.35)',
      }}>
        <svg
          width={iconSize * 0.52}
          height={iconSize * 0.52}
          viewBox="0 0 20 20"
          fill="none"
        >
          {/* Lightning bolt / V shape */}
          <path
            d="M11.5 2L4 11.5H9.5L8.5 18L16 8.5H10.5L11.5 2Z"
            fill="#060A0E"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div>
        <div style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize,
          color: '#ECF0F4',
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}>
          Social<span style={{
            background: 'linear-gradient(135deg, #00E5A0, #00B4D8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>Mind</span>
        </div>
        {showTagline && (
          <div style={{
            fontSize: 9,
            color: '#7A8FA0',
            fontFamily: 'JetBrains Mono, monospace',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginTop: 2,
          }}>
            Faceless Automation
          </div>
        )}
      </div>
    </div>
  )
}
