import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

type TierConfig = { tier: 'starter' | 'pro' | 'agency'; limit: number }

// Resolve a Stripe price id to our (tier, limit) tuple.
//
// Each tier has a monthly+annual price id; the env vars are the source of truth
// so test/prod stay aligned. Falls back to the symbolic name (legacy) so old
// configs keep working until the env is set.
function tierForPrice(priceId: string): TierConfig {
  const matches = (envName: string) => Deno.env.get(envName) === priceId

  if (matches('STRIPE_PRICE_AGENCY_MONTHLY') || matches('STRIPE_PRICE_AGENCY_ANNUAL') || /agency/i.test(priceId)) {
    return { tier: 'agency', limit: -1 }
  }
  if (matches('STRIPE_PRICE_PRO_MONTHLY') || matches('STRIPE_PRICE_PRO_ANNUAL') || /pro/i.test(priceId)) {
    return { tier: 'pro', limit: 100 }
  }
  return { tier: 'starter', limit: 20 }
}

async function upsertFromSubscription(
  supabase: ReturnType<typeof createClient>,
  sub: Stripe.Subscription,
  userIdHint?: string,
) {
  const userId = userIdHint ?? sub.metadata?.user_id
  if (!userId) {
    console.warn('No user_id on subscription', sub.id)
    return
  }

  const priceId = sub.items.data[0]?.price.id ?? ''
  const cfg = tierForPrice(priceId)
  const statusMap: Record<string, string> = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    unpaid: 'past_due',
    canceled: 'canceled',
    incomplete: 'incomplete',
    incomplete_expired: 'canceled',
    paused: 'past_due',
  }

  await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null,
      stripe_subscription_id: sub.id,
      tier: cfg.tier,
      status: statusMap[sub.status] ?? 'incomplete',
      posts_limit: cfg.limit,
      current_period_end: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
    },
    { onConflict: 'user_id' },
  )
}

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('No signature', { status: 400 })

  const body = await req.text()
  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '',
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response(`Webhook Error: ${err}`, { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        if (!userId || !session.subscription) break
        const sub = await stripe.subscriptions.retrieve(session.subscription as string)
        await upsertFromSubscription(supabase, sub, userId)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        await upsertFromSubscription(supabase, sub)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const subId = invoice.subscription as string | null
        if (!subId) break
        const sub = await stripe.subscriptions.retrieve(subId)
        await upsertFromSubscription(supabase, sub)
        // Reset monthly counter on a successful renewal
        await supabase.from('subscriptions').update({
          posts_used_this_month: 0,
        }).eq('stripe_subscription_id', subId)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subId = invoice.subscription as string | null
        if (!subId) break
        await supabase.from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', subId)
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

      default:
        // No-op for events we don't subscribe to.
        break
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
