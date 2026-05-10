import type { Platform } from '@/types/database'

// Real platform brand logos as inline SVGs — sized consistently for UI use
function TikTokLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.89a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 4.11-2.55v-3.6a6.37 6.37 0 0 0-4.11 1.5A6.37 6.37 0 0 0 4 16.35a6.38 6.38 0 0 0 6.36 6.37 6.39 6.39 0 0 0 6.38-6.38v-7.1a8.28 8.28 0 0 0 4.85 1.54v-3.45a4.83 4.83 0 0 1-2-.64Z" fill="#FF0050"/>
    </svg>
  )
}

function InstagramLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig-grad)"/>
      <circle cx="12" cy="12" r="5" fill="none" stroke="#fff" strokeWidth="1.5"/>
      <circle cx="17.5" cy="6.5" r="1.5" fill="#fff"/>
      <defs>
        <linearGradient id="ig-grad" x1="2" y1="22" x2="22" y2="2">
          <stop stopColor="#FFDC80"/><stop offset="0.3" stopColor="#E1306C"/><stop offset="0.7" stopColor="#833AB4"/><stop offset="1" stopColor="#405DE6"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

function YouTubeLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="1" y="4" width="22" height="16" rx="4" fill="#FF0000"/>
      <path d="M10 9.5v5l5.5-2.5L10 9.5Z" fill="#fff"/>
    </svg>
  )
}

function XLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#000"/>
      <path d="M5.5 5.5l5.1 6.8L5.3 18h1.2l4.5-5.1 3.6 5.1h4l-5.3-7.1L18 5.5h-1.2l-4.2 4.8L9.4 5.5H5.5Zm1.7.8h1.8l8.1 10.9h-1.8L7.2 6.3Z" fill="#fff"/>
    </svg>
  )
}

function LinkedInLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#0A66C2"/>
      <path d="M6.5 9.5h2.5v8H6.5v-8ZM7.75 8.25a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3.75 1.25h2.3v1.1h.1a2.5 2.5 0 0 1 2.3-1.25c2.4 0 2.8 1.5 2.8 3.5v4.15h-2.5v-3.65c0-.9 0-2-1.2-2-1.2 0-1.4.95-1.4 1.95v3.7H11.5v-7.5Z" fill="#fff"/>
    </svg>
  )
}

function FacebookLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#1877F2"/>
      <path d="M17 12.5c0-2.76-2.24-5-5-5s-5 2.24-5 5c0 2.5 1.83 4.57 4.22 4.94v-3.5H9.95v-1.44h1.27v-1.1c0-1.25.75-1.95 1.9-1.95.55 0 1.12.1 1.12.1v1.23h-.63c-.63 0-.82.39-.82.8v.95h1.4l-.23 1.44h-1.17v3.5A5.01 5.01 0 0 0 17 12.5Z" fill="#fff"/>
    </svg>
  )
}

function PinterestLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#E60023"/>
      <path d="M12 5a7 7 0 0 0-2.85 13.44c-.1-.85 0-1.88.26-2.8l1-4.14s-.23-.47-.23-1.2c0-1.12.65-1.96 1.47-1.96.7 0 1.03.52 1.03 1.14 0 .7-.44 1.74-.67 2.7-.2.8.4 1.46 1.18 1.46 1.42 0 2.5-1.5 2.5-3.66 0-1.9-1.38-3.25-3.35-3.25-2.28 0-3.62 1.7-3.62 3.48 0 .68.27 1.42.6 1.82.07.07.08.14.05.22l-.2.8c-.03.13-.1.16-.24.1-.9-.42-1.46-1.74-1.46-2.8 0-2.27 1.65-4.37 4.77-4.37 2.5 0 4.45 1.78 4.45 4.17 0 2.5-1.57 4.5-3.74 4.5-.73 0-1.42-.38-1.66-.83l-.45 1.72c-.16.6-.6 1.4-.9 1.87A7 7 0 0 0 12 19a7 7 0 0 0 0-14Z" fill="#fff"/>
    </svg>
  )
}

function SnapchatLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#FFFC00"/>
      <path d="M12 6c-1.3 0-2.5.4-3.4 1.2-.85.75-1.3 1.8-1.3 2.8 0 .45.1.9.3 1.3.15.35.4.65.7.85.3.2.6.35.95.4v.15c0 .55.15 1.05.45 1.5.3.45.75.8 1.25 1 .5-.2.95-.55 1.25-1 .3-.45.45-.95.45-1.5v-.15c.35-.05.65-.2.95-.4.3-.2.55-.5.7-.85.2-.4.3-.85.3-1.3 0-1-.45-2.05-1.3-2.8C14.5 6.4 13.3 6 12 6Z" fill="#000"/>
    </svg>
  )
}

const PLATFORM_LOGO_MAP: Record<Platform, React.FC<{ size?: number }>> = {
  tiktok: TikTokLogo,
  instagram: InstagramLogo,
  youtube: YouTubeLogo,
  twitter: XLogo,
  linkedin: LinkedInLogo,
  facebook: FacebookLogo,
  pinterest: PinterestLogo,
  snapchat: SnapchatLogo,
}

export function PlatformLogo({ platform, size = 16 }: { platform: Platform; size?: number }) {
  const Logo = PLATFORM_LOGO_MAP[platform]
  if (!Logo) return null
  return <Logo size={size} />
}

export { TikTokLogo, InstagramLogo, YouTubeLogo, XLogo, LinkedInLogo, FacebookLogo, PinterestLogo, SnapchatLogo }
