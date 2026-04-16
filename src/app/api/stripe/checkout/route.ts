import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe, PRICING_PLANS, createOrRetrieveCustomer } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const planId: string = body.planId ?? "";

  const plan = PRICING_PLANS.find((p) => p.id === planId && p.price > 0);
  if (!plan) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const customerId = await createOrRetrieveCustomer(
      user.id,
      user.email!
    );

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/account?upgraded=1`,
      cancel_url: `${appUrl}/pricing`,
      subscription_data: {
        metadata: { supabaseUserId: user.id, tier: plan.tier },
        trial_period_days: 7,
      },
      metadata: { supabaseUserId: user.id, planId: plan.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout]", err);
    return NextResponse.json(
      { error: "Failed to create checkout session." },
      { status: 500 }
    );
  }
}
