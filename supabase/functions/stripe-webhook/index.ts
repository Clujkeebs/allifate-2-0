import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const TIER_LIMITS: Record<string, { tier: string; limit: number }> = {
  price_starter_monthly: { tier: 'starter', limit: 20 },
  price_starter_annual: { tier: 'starter', limit: 20 },
  price_pro_monthly: { tier: 'pro', limit: 100 },
  price_pro_annual: { tier: 'pro', limit: 100 },
  price_agency_monthly: { tier: 'agency', limit: -1 },
  price_agency_annual: { tier: 'agency', limit: -1 },
}

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('No signature', { status: 400 })

  const body = await req.text()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '')
  } catch (err) {
    return new Response(`Webhook Error: ${err}`, { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.user_id
      if (!userId) break

      const sub = await stripe.subscriptions.retrieve(session.subscription as string)
      const priceId = sub.items.data[0].price.id
      const config = TIER_LIMITS[priceId] || { tier: 'starter', limit: 20 }

      await supabase.from('subscriptions').upsert({
        user_id: userId,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        tier: config.tier,
        status: 'active',
        posts_limit: config.limit,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      })
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      const subId = invoice.subscription as string
      const sub = await stripe.subscriptions.retrieve(subId)

      await supabase.from('subscriptions').update({
        status: 'active',
        posts_used_this_month: 0, // Reset monthly usage
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      }).eq('stripe_subscription_id', subId)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      await supabase.from('subscriptions').update({ status: 'past_due' })
        .eq('stripe_subscription_id', invoice.subscription as string)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await supabase.from('subscriptions').update({
        status: 'canceled',
        tier: 'starter',
        posts_limit: 20,
      }).eq('stripe_subscription_id', sub.id)
      break
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
