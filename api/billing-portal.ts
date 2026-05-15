import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

type SubscriptionRow = { stripe_customer_id: string | null } | null

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    return res.status(200).end()
  }
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'No auth token' })

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) return res.status(500).json({ error: 'Stripe is not configured' })
  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })

  const supabase = createClient(
    process.env.SUPABASE_URL ?? '',
    process.env.SUPABASE_ANON_KEY ?? '',
    { global: { headers: { Authorization: authHeader } } },
  )

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return res.status(403).json({ error: 'Unauthorized' })

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const customerId = (sub as SubscriptionRow)?.stripe_customer_id
    if (!customerId) {
      return res.status(400).json({ error: 'No Stripe customer on file. Upgrade first to manage billing.' })
    }

    const origin = req.headers.origin || process.env.PUBLIC_SITE_URL || 'https://virlo.ai'
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/settings`,
    })

    return res.status(200).json({ url: portal.url })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('billing-portal error:', err)
    return res.status(500).json({ error: errMsg })
  }
}
