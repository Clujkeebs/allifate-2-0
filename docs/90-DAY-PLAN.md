# Virlo — 90-Day Plan

This is the operator playbook: ship the remaining product gaps, launch a low-effort affiliate engine that runs from email automation, and stack distribution channels that compound. Each block is sized so a solo founder + Claude can ship it.

Bird's-eye view:

| Phase   | Weeks   | Theme                  | Goal                                                    |
| ------- | ------- | ---------------------- | ------------------------------------------------------- |
| Phase 1 | 1–3     | Finish + harden        | Production-grade product, zero embarrassing edges       |
| Phase 2 | 4–6     | Soft launch + content  | First 100 paying users, lighthouse case studies         |
| Phase 3 | 7–9     | Affiliate + outbound   | Recurring partner revenue, scaled email outbound        |
| Phase 4 | 10–13   | Compounding distribution | SEO + community + product-led-growth flywheel         |

North-star metric: **Paid weekly active accounts (WAA-paid)**. Vanity metrics (sign-ups, social followers) are ignored unless they convert.

---

## Phase 1 — Finish & harden (Days 1–21)

### Product gaps to close (priority order)

1. **Stripe price IDs wired in env** — create products in Stripe Dashboard, paste IDs into Vercel env vars, test a full Starter monthly checkout end-to-end. (`STRIPE_PRICE_*` keys are in `.env.example`.)
2. **Stripe webhook deployed** — `supabase functions deploy stripe-webhook`; register endpoint in Stripe with the events listed in the README. Verify a `checkout.session.completed` flips the user's `subscriptions.tier`.
3. **OAuth — pick one mode and go deep**:
   - *Easiest:* sign up for Zernio, set `VITE_ZERNIO_API_KEY`. Settings → "Connect all" then works for all 8 platforms in one shot.
   - *Without Zernio:* implement the `/oauth-exchange/authorize` endpoint on the Supabase function for TikTok + Instagram + YouTube first (the three highest-leverage platforms); ship Twitter/LinkedIn/Facebook/Pinterest/Snapchat in week 3.
4. **Posting pipeline** — wire a single platform end-to-end (suggest YouTube Shorts) so an approved piece actually publishes via the scheduled cron. This is the *one* thing that turns Virlo from "feels real" → "is real."
5. **Voice / video assembly** — until you can render a finished MP4 server-side, Virlo ships *briefs*, not *content*. Plan: integrate ElevenLabs for voiceover + an FFmpeg-on-Lambda or Shotstack for assembly. If that's too heavy for week 2, position Virlo as a "scripts + scheduling" tool for now and clearly mark video assembly as "v1.1 — June" on the landing page. Honesty converts better than vapor.
6. **Real-time job pipeline UX** — the new realtime subscription in `CreatePage.tsx` means progress bars are now driven by actual DB state. Make sure your background job (Supabase queue / cron / external worker) actually updates `pipeline_stage` and `pipeline_progress` during processing.

### Trust + legal

- Pages exist (`/privacy`, `/terms`) — replace boilerplate with a Termly or iubenda generator, run by a lawyer once revenue is past $5k MRR.
- Cookie banner (skip if not targeting EU initially, otherwise required).
- A real Status page (Statuspage.io free tier) linked from the footer once you have paying users.

### Analytics hygiene

- Add PostHog (free up to 1M events) on every page. Track `signup`, `connect_platform`, `generate_content`, `approve_post`, `start_checkout`, `checkout_success`.
- Add Sentry on frontend + serverless. Free tier is fine for first 90 days.

### Operational rhythm (set this on day 1, don't break it)

- Monday: review last week's funnel, pick one product change for the week
- Wednesday: ship product change to staging
- Friday: ship to prod, write release notes (literally `git log` → cleaned up)
- Sunday: queue social posts (using Virlo itself — eat your dog food)

---

## Phase 2 — Soft launch + content (Days 22–42)

### Day 22: Soft launch

The mistake most solo founders make is launching to silence on Product Hunt week one. Don't. Launch in concentric rings:

1. **Ring 1 — friends + warm network (Day 22):** 50–100 personal DMs. Plain text, no design, no spam. Ask for honest 5-min feedback, not signups. Target: 10 signups from 50 sends.
2. **Ring 2 — niche communities (Day 25–28):** Indie Hackers, Reddit (r/SaaS, r/Entrepreneur, r/SocialMediaMarketing, r/marketing). One post per community per week. Lead with the problem story, not the product.
3. **Ring 3 — Twitter/LinkedIn build-in-public thread (Day 29):** Reveal the MRR target, the stack, real numbers. People reward transparency.
4. **Ring 4 — Product Hunt (Day 35):** Only after you have ~30 sign-ups who can hunt for you. Schedule for Tuesday 12:01am PT. Have 5 testimonials lined up to drop in comments.

### Content engine — *eat your own dog food*

Every public post you make must be created in Virlo. This serves three purposes: (1) it dogfoods the product, (2) it shows reach is achievable, (3) every post is itself an ad.

Daily output target:

- 1 long-form YouTube/LinkedIn (≈2 min) — content marketing
- 3 short-form (TikTok / Reels / Shorts) — same script, different platform-native variants
- 1 X/Twitter thread — repurposed from the long-form
- 1 Pinterest pin — repurposed thumbnails

That's 6 pieces of content/day from 1 prompt — exactly what Virlo sells. If the product can't sustain *your* schedule, that's the first thing to fix.

### Case-study farming

By Day 42, you want 3 case studies in hand:

- Pick three early users from different niches (creator, B2B, e-com).
- Give them Pro for free for 90 days in exchange for a recorded interview + screen-share showing their workflow + numerical results.
- Edit to a 90-second testimonial + a written 1-pager. Drop on the landing page and replace the placeholder testimonials.

---

## Phase 3 — Affiliate via simple email automation (Days 43–63)

### The affiliate model

- Pay 30% recurring on every paid month for 12 months.
- Pay via PayPal/Stripe Connect monthly on the 5th.
- Use Rewardful (~$49/mo) or Tolt — both integrate with Stripe in <10 minutes and need zero code.

### Who to recruit

Three buckets, ranked by ease:

1. **Creators in adjacent SaaS niches** (Notion, Canva, ConvertKit, ChatGPT-power-user influencers). They already sell tools. Recurring revenue is irresistible.
2. **YouTubers who do "ship-a-startup-in-N-days" content.** Virlo is a perfect tool drop in those videos.
3. **Newsletter operators in marketing + creator-economy space** (Justin Welsh, The Marketing Millennials, Creator Spotlight, etc.).

Target: 50 affiliates signed by Day 63. Realistic conversion rate: 1 in 30 cold emails replies, 1 in 5 replies signs up. So budget ~1,500 outbound emails.

### The email automation (this is the whole loop)

Tools: **Instantly.ai** or **Smartlead** ($37–97/mo) for sending + warmup, **Apollo.io** ($49–99/mo) for lead lists, **Clay** ($150/mo, optional) for enrichment. Total: ~$130/mo for the full stack.

Sequence — 4 emails over 14 days:

**Email 1 — Day 0 (Hook)**

```
Subject: {{firstName}}, recurring 30% on this for {{audience_descriptor}}?

Hi {{firstName}} — I run Virlo, an AI content engine that turns one prompt
into platform-native posts for all 8 socials. We're picking 50 partners
who already serve {{audience_descriptor}} for an early-bird affiliate
program: 30% recurring for 12 months, no clawbacks.

If "show me before I commit" works for you, here's a 90-sec walkthrough:
{{loom_link}}

Reply "in" and I'll send the partner kit. Reply "no thanks" and I'll
stop bothering you. Reply with questions and I'll answer fast.

— {{your_name}}
```

**Email 2 — Day 3 (Proof)** — short. One line about a real result from a case study + the partner link.

**Email 3 — Day 7 (Story)** — 2–3 sentences about why you built Virlo. Founder voice, not marketer voice.

**Email 4 — Day 14 (Breakup)** — "Going dark on you after this — if it's not a fit, that's totally fine. Here's the partner link if you change your mind: {{link}}"

### Partner kit (drop in Notion, share via a single link)

- One-pager: what Virlo is, who it's for, the affiliate terms
- Pre-written swipe copy: 3 X threads, 2 LinkedIn posts, 1 newsletter blurb
- Approved demo Loom they can embed
- Logo + brand assets
- Unique affiliate link

### Outreach hygiene

- Warm a fresh sending domain for 14 days before blasting (Instantly does this automatically).
- Cap at 30 sends/day per inbox, 3 inboxes = 90/day = ~600/week.
- Personalize line 1 (use {{audience_descriptor}} from Clay enrichment).
- Never send Friday/Saturday/Sunday — they tank reply rates.

---

## Phase 4 — Compounding distribution (Days 64–90)

By now you should have: working product (or honest scoped product), 3 case studies, 30+ paying users, 5–10 active affiliates. Now build channels that don't require daily effort.

### SEO content (long tail)

Pick 30 high-intent, low-competition keywords. Examples:

- "AI script generator for TikTok"
- "Auto-post to LinkedIn from one prompt"
- "Best Pinterest description generator"
- "How to repurpose Reels to YouTube Shorts"

Write 1500-word articles weekly. Each must include: (1) a real comparison or screenshot, (2) a free tool/calculator on-page, (3) a clear "Try Virlo free" CTA. Goal by Day 90: 12 articles indexed, 2–3 ranking on page 1 for long-tail.

Tooling: Use Claude + Surfer or Frase for outlines. Edit by hand — Google detects pure-AI content easily now.

### YouTube channel — *the highest-leverage move*

Why: A single 8-minute "I built X to make content for me" video routinely does 100k+ views in this niche. One viral video > 1000 cold emails.

Schedule: 1 video/week. Format ideas:

- "I tried letting AI run my socials for 30 days — here's what worked"
- "The faceless YouTube channel that prints money (and how to build it)"
- "I replaced my $4k/mo content team with one prompt. Full walkthrough"

Don't lie. Make them honest, screen-record everything, show real revenue (your own).

### Community presence

Pick **one** community to live in. Don't spread thin.

- *If creator-economy:* Creator Now, ConvertKit Sparkle.
- *If SaaS-builder:* MicroConf Connect, Indie Hackers.
- *If marketing-pro:* Demand Curve Insider, Superpath.

Show up daily, answer questions for free, become a *known* name. Mention Virlo only when contextually relevant. Pure value first, sell second.

### Referral upgrades

Add an in-product referral inside `SettingsPage` (week 11):
"Give a friend 30 days of Pro free → you get 30 days free." Tolt/Rewardful supports double-sided referrals out of the box.

### Lifecycle automation

Resend or Postmark + Loops.so. Day-N drip emails:

- Day 0: welcome + 90-sec setup video
- Day 1: "Here's what works on TikTok this week" (genuine insight)
- Day 3: "Did you connect a platform yet?" (one-click connect link)
- Day 7: case-study email
- Day 14: discount on annual (timed offer)
- Day 30: NPS survey

---

## What this costs (rough, monthly)

| Bucket                   | Tool                   | Monthly |
|--------------------------|------------------------|---------|
| Email outbound           | Instantly + Apollo     | $130    |
| Affiliate platform       | Rewardful or Tolt      | $49     |
| Analytics                | PostHog                | $0      |
| Error tracking           | Sentry                 | $0      |
| Hosting (Vercel + Supabase) | both                | $0–25   |
| Stripe (per txn)         | —                      | 2.9% + 30¢ |
| Newsletter/lifecycle     | Resend or Loops        | $0–30   |
| **Total fixed**          |                        | **~$220–250** |

Plus: paid LLM/image calls scale with usage, budget another $100–500 depending on customer count.

---

## Day-90 success criteria

- [ ] Product publishes content end-to-end to at least 3 platforms
- [ ] 100 paying customers
- [ ] 10 active affiliates driving ≥ 20% of new MRR
- [ ] 1 viral piece of organic content (≥ 100k views)
- [ ] 3 published case studies on the landing page
- [ ] Stripe MRR ≥ $5k (target: $10k)
- [ ] You have a clear answer for "what do I work on next week?" without thinking — the funnel tells you

If you hit half of these, Virlo has product-market fit signal and you raise/scale. If you hit none, the product positioning is the issue, not effort — return to user interviews before doing more outbound.
