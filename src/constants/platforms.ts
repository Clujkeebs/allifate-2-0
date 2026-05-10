import type { ReactNode } from 'react'
import { PlatformLogo } from '@/components/ui/PlatformLogos'
import type { Platform } from '@/types/database'

export interface PlatformConfig {
  id: Platform
  name: string
  icon: ReactNode
  color: string
  bgColor: string
  formats: string[]
  maxVideoLength: number
  aspectRatio: string
}

export const PLATFORMS: PlatformConfig[] = [
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: <PlatformLogo platform="tiktok" size={16} />,
    color: '#ff0050',
    bgColor: 'rgba(255,0,80,0.1)',
    formats: ['Vertical video (9:16)', 'Up to 10 min'],
    maxVideoLength: 600,
    aspectRatio: '9/16',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: <PlatformLogo platform="instagram" size={16} />,
    color: '#e1306c',
    bgColor: 'rgba(225,48,108,0.1)',
    formats: ['Reels (9:16)', 'Feed (1:1)', 'Carousel', 'Stories'],
    maxVideoLength: 3600,
    aspectRatio: '9/16',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: <PlatformLogo platform="youtube" size={16} />,
    color: '#ff0000',
    bgColor: 'rgba(255,0,0,0.1)',
    formats: ['Shorts (9:16)', 'Long-form (16:9)'],
    maxVideoLength: 43200,
    aspectRatio: '16/9',
  },
  {
    id: 'twitter',
    name: 'X / Twitter',
    icon: <PlatformLogo platform="twitter" size={16} />,
    color: '#1d9bf0',
    bgColor: 'rgba(29,155,240,0.1)',
    formats: ['Video (2:20 max)', 'Images (4 max)', 'Threads'],
    maxVideoLength: 140,
    aspectRatio: '16/9',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: <PlatformLogo platform="linkedin" size={16} />,
    color: '#0a66c2',
    bgColor: 'rgba(10,102,194,0.1)',
    formats: ['Video (16:9 or 1:1)', 'Carousels', 'Articles'],
    maxVideoLength: 600,
    aspectRatio: '1/1',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: <PlatformLogo platform="facebook" size={16} />,
    color: '#1877f2',
    bgColor: 'rgba(24,119,242,0.1)',
    formats: ['Feed video', 'Reels', 'Stories', 'Carousels'],
    maxVideoLength: 14400,
    aspectRatio: '16/9',
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    icon: <PlatformLogo platform="pinterest" size={16} />,
    color: '#e60023',
    bgColor: 'rgba(230,0,35,0.1)',
    formats: ['Pins (2:3)', 'Video pins', 'Idea pins'],
    maxVideoLength: 300,
    aspectRatio: '2/3',
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    icon: <PlatformLogo platform="snapchat" size={16} />,
    color: '#fffc00',
    bgColor: 'rgba(255,252,0,0.1)',
    formats: ['Snaps (9:16)', 'Spotlight (< 60s)'],
    maxVideoLength: 60,
    aspectRatio: '9/16',
  },
]

export const PLATFORM_MAP = Object.fromEntries(PLATFORMS.map(p => [p.id, p])) as Record<Platform, PlatformConfig>

export const NICHES = [
  'E-commerce', 'Fitness & Health', 'Food & Cooking', 'Finance & Investing',
  'Creator Economy', 'B2B SaaS', 'Real Estate', 'Education', 'Fashion & Beauty',
  'Travel', 'Gaming', 'Music', 'Sports', 'Technology', 'Lifestyle', 'Parenting',
]

export const TONES = [
  { id: 'professional', label: 'Professional', desc: 'Polished, authoritative, credible' },
  { id: 'casual', label: 'Casual', desc: 'Friendly, conversational, relatable' },
  { id: 'educational', label: 'Educational', desc: 'Informative, clear, value-driven' },
  { id: 'entertaining', label: 'Entertaining', desc: 'Fun, engaging, shareable' },
  { id: 'inspirational', label: 'Inspirational', desc: 'Motivating, emotional, aspirational' },
]

export const SUBSCRIPTION_PLANS = [
  {
    id: 'starter',
    name: 'Faceless Starter',
    price: 39,
    annualPrice: 390,
    posts: 20,
    platforms: 3,
    generations: 40,
    features: [
      '20 viral posts/month',
      '3 platform connections',
      '40 AI generation jobs',
      'Standard 11Labs voices',
      '4K AI Visuals (DALL-E 3)',
      '7-day free trial',
    ],
  },
  {
    id: 'pro',
    name: 'Faceless Pro',
    price: 99,
    annualPrice: 990,
    posts: 100,
    platforms: 8,
    generations: -1,
    popular: true,
    features: [
      '100 viral posts/month',
      'All 8 platforms',
      'Unlimited AI generations',
      'Premium 11Labs voices',
      'Priority render queue',
      'Autopilot scheduling',
      'Custom niche training',
      '7-day free trial',
    ],
  },
  {
    id: 'agency',
    name: 'Automation Agency',
    price: 249,
    annualPrice: 2490,
    posts: -1,
    platforms: 8,
    generations: -1,
    features: [
      'Unlimited viral posts',
      'All 8 platforms',
      'Unlimited AI generations',
      '5 sub-accounts / clients',
      'White-label video output',
      'Bulk Reddit-to-Video mode',
      'API access for bulk tools',
      'Dedicated channel manager',
    ],
  },
]
