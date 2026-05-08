import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type')
    return res.status(200).end()
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'No auth token' })

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
    apiVersion: '2026-04-22.dahlia' as const,
  })

  const supabase = createClient(
    process.env.SUPABASE_URL ?? '',
    process.env.SUPABASE_ANON_KEY ?? '',
    { global: { headers: { Authorization: authHeader } } },
  )

  try {
    const { priceId, userId, annual } = req.body

    if (!priceId || !userId) {
      return res.status(400).json({ error: 'Missing priceId or userId' })
    }

    // Verify the user is who they claim to be
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    // Get or create Stripe customer
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    let customerId: string | null = null
    if (sub) customerId = sub.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: userId },
      })
      customerId = customer.id
    }

    // Create Checkout session
    const origin = req.headers.origin || 'https://virlo.ai'
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { user_id: userId, annual: annual ? 'true' : 'false' },
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/upgrade?checkout=canceled`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      tax_id_collection: { enabled: true },
      subscription_data: {
        metadata: { user_id: userId },
      },
    })

    return res.status(200).json({ url: session.url })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('checkout error:', err)
    return res.status(500).json({ error: errMsg })
  }
}
