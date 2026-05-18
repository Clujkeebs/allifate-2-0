import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

type SubscriptionRow = {
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
} | null

// Map our plan id + cadence to a Stripe price id. We accept env-configured ids
// so the same code runs in test/prod. Falls back to the symbolic name the
// dashboard sends so a misconfigured env produces a clear Stripe error rather
// than a silent wrong-plan checkout.
function priceIdFor(plan: string, annual: boolean, fallback?: string): string {
  const key = `STRIPE_PRICE_${plan.toUpperCase()}_${annual ? 'ANNUAL' : 'MONTHLY'}`
  return process.env[key] || fallback || ''
}

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
  const stripe = new Stripe(stripeKey, { apiVersion: '2026-04-22.dahlia' })

  // Anon client with the user JWT — RLS scopes every read/write to this user.
  const supabase = createClient(
    process.env.SUPABASE_URL ?? '',
    process.env.SUPABASE_ANON_KEY ?? '',
    { global: { headers: { Authorization: authHeader } } },
  )

  // Service-role client for writes that must bypass RLS (we only set the
  // stripe ids; we never trust client input for tier/limits — the webhook does).
  const serviceClient = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null

  try {
    const { plan, annual, priceId: rawPriceId } = req.body ?? {}

    if (!plan && !rawPriceId) {
      return res.status(400).json({ error: 'Missing plan or priceId' })
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return res.status(403).json({ error: 'Unauthorized' })

    const priceId = plan ? priceIdFor(String(plan), Boolean(annual), rawPriceId) : rawPriceId
    if (!priceId) {
      return res.status(400).json({
        error: `No Stripe price configured for plan "${plan}" (${annual ? 'annual' : 'monthly'}). Set STRIPE_PRICE_${String(plan).toUpperCase()}_${annual ? 'ANNUAL' : 'MONTHLY'} in env.`,
      })
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('user_id', user.id)
      .maybeSingle()

    let customerId = (sub as SubscriptionRow)?.stripe_customer_id || null

    if (!customerId) {
      // Try to recover an existing customer by email before minting a new one
      const existing = user.email
        ? await stripe.customers.list({ email: user.email, limit: 1 })
        : { data: [] as Stripe.Customer[] }

      const customer = existing.data[0]
        ?? (await stripe.customers.create({
          email: user.email,
          metadata: { user_id: user.id },
        }))

      customerId = customer.id

      // Persist immediately so retries don't create duplicate Stripe customers.
      if (serviceClient) {
        await serviceClient.from('subscriptions').upsert(
          { user_id: user.id, stripe_customer_id: customerId },
          { onConflict: 'user_id' },
        )
      }
    }

    const origin = req.headers.origin || process.env.PUBLIC_SITE_URL || 'https://virlo.ai'
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { user_id: user.id, plan: String(plan ?? ''), annual: annual ? 'true' : 'false' },
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/upgrade?checkout=canceled`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      tax_id_collection: { enabled: true },
      subscription_data: {
        metadata: { user_id: user.id, plan: String(plan ?? '') },
      },
    })

    return res.status(200).json({ url: session.url })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('create-checkout error:', err)
    return res.status(500).json({ error: errMsg })
  }
}
