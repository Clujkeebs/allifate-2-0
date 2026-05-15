# Virlo

Virlo is an AI content engine for creating, reviewing, scheduling, and analyzing platform-native social content from one prompt.

## Product surface

- Landing page with pricing, social proof, platform coverage, and conversion CTAs.
- Auth, onboarding, dashboard, content creation, review, schedule, library, analytics, settings, upgrade, privacy, and terms routes.
- Multi-platform content workflow for TikTok, Instagram, YouTube, X/Twitter, LinkedIn, Facebook, Pinterest, and Snapchat.
- Human review before publishing, with OAuth callback handling for direct and Zernio platform connections.
- Real-time job pipeline (Supabase Realtime), live usage tracking, and Stripe-backed billing with a self-serve customer portal.

## Local development

```bash
npm install
cp .env.example .env.local        # fill in keys
npm run dev -- --host 127.0.0.1   # http://127.0.0.1:5173
```

## Verification

```bash
npm run lint
npm run build
```

## Architecture

```
┌──────────────┐  realtime  ┌────────────┐  events  ┌──────────────┐
│  React (Vite)│ ─────────▶ │ Supabase DB │ ───────▶ │  Edge fns    │
│   /src       │            │   + RLS     │          │  (Deno)      │
└──────┬───────┘            └─────┬───────┘          └──────┬───────┘
       │                          │                          │
       │ /api/* (Vercel Node)     │ Stripe webhook ◀─────────┘
       ▼                          ▼
┌─────────────────────┐   ┌──────────────────┐
│  Anthropic (Claude) │   │   Stripe         │
└─────────────────────┘   └──────────────────┘
```

- **Frontend**: React 19 + Vite + Zustand + react-router + Tailwind 4. Lazy-routed pages, real-time job updates via Supabase channels.
- **API routes** (`/api/*`, Vercel Node 20):
  - `POST /api/generate` — Claude orchestration; produces platform-native briefs and stores `content_pieces`.
  - `POST /api/create-checkout` — creates a Stripe Checkout session and persists the new customer id.
  - `POST /api/billing-portal` — opens the Stripe customer portal for self-serve management.
  - `POST /api/zapier-webhook` — Zapier two-way integration.
  - `POST /api/zernio-webhook` — Zernio status/analytics push.
- **Edge functions** (`supabase/functions/*`): Stripe webhook, OAuth code exchange, async content generation, image generation.
- **Database**: Supabase Postgres. Migrations are idempotent and apply in order. Migration `006_billing_and_indexes.sql` adds the `increment_posts_used` RPC and the usage-counter RLS policy.

## Database setup

```bash
# From the Supabase Dashboard (SQL Editor) or supabase CLI:
supabase db push                     # applies migrations 001 → 006
```

Storage buckets (one-time, see the comment at the bottom of `001_initial_schema.sql`):

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('user-assets', 'user-assets', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('content-output', 'content-output', true);
```

## Stripe setup

1. Create three products (Starter, Pro, Agency), each with a monthly and an annual recurring price.
2. Drop the six price ids into env vars: `STRIPE_PRICE_<TIER>_<MONTHLY|ANNUAL>`.
3. Configure the webhook endpoint to `https://<your-project>.functions.supabase.co/stripe-webhook` and subscribe to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the signing secret into `STRIPE_WEBHOOK_SECRET` on the Supabase function.

## Deployment (Vercel + Supabase)

1. Push the repo to GitHub.
2. Import the project into Vercel; framework preset = **Vite**.
3. Add every variable from `.env.example` in *Vercel → Project → Settings → Environment Variables* (mark the non-`VITE_` ones as **Production** only).
4. Deploy the Supabase edge functions: `supabase functions deploy stripe-webhook oauth-exchange generate-content generate-images`.
5. Verify:
   - `/api/generate` → 200 with a valid JWT
   - `/api/create-checkout` → returns a Stripe session URL
   - Stripe webhook → 200 on a test event (use `stripe trigger checkout.session.completed`)
   - OAuth round-trip (Zernio or per-platform) lands on `/oauth/callback`

## OAuth modes

- **Zernio (recommended)** — set `VITE_ZERNIO_API_KEY` and the Settings page exposes a single "Connect all" action that authorizes all 8 platforms in one hop.
- **Direct per-platform OAuth** — leave Zernio unset; the `oauth-exchange` edge function performs token exchange using `<PROVIDER>_CLIENT_ID/SECRET` env vars.

## Notes

- All client-side data fetches go through the Supabase JS client with the user's JWT; every table is protected by row-level security.
- The Vercel functions never use the service-role key for user-scoped reads — only for webhook writes that legitimately need to bypass RLS.
- Anthropic model is `claude-sonnet-4-6` by default; override with `ANTHROPIC_MODEL` if you want to A/B test Opus.
