import Stripe from "stripe";
import type { PricingPlan } from "@/types";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil",
  typescript: true,
});

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    description: "Get started with basic trend insights",
    price: 0,
    currency: "usd",
    interval: "month",
    stripePriceId: "",
    tier: "free",
    highlighted: false,
    features: [
      "5 product scans / day",
      "Top 10 trending products",
      "Basic analytics",
      "1 saved product list",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    description: "Perfect for solo TikTok Shop affiliates",
    price: 29,
    currency: "usd",
    interval: "month",
    stripePriceId: process.env.STRIPE_PRICE_ID_STARTER ?? "",
    tier: "starter",
    highlighted: false,
    features: [
      "50 product scans / day",
      "Top 50 trending products",
      "Advanced analytics",
      "10 saved product lists",
      "Commission calculator",
      "Email alerts",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "For serious affiliates scaling their income",
    price: 79,
    currency: "usd",
    interval: "month",
    stripePriceId: process.env.STRIPE_PRICE_ID_PRO ?? "",
    tier: "pro",
    highlighted: true,
    features: [
      "Unlimited product scans",
      "Real-time trending feed",
      "AI-powered product analysis",
      "Unlimited saved lists",
      "Competitor tracking",
      "Priority support",
      "API access",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For agencies and high-volume sellers",
    price: 199,
    currency: "usd",
    interval: "month",
    stripePriceId: process.env.STRIPE_PRICE_ID_ENTERPRISE ?? "",
    tier: "enterprise",
    highlighted: false,
    features: [
      "Everything in Pro",
      "Dedicated account manager",
      "Custom integrations",
      "Team seats (up to 10)",
      "White-label reports",
      "SLA guarantee",
    ],
  },
];

export async function createOrRetrieveCustomer(
  userId: string,
  email: string
): Promise<string> {
  const customers = await stripe.customers.list({ email, limit: 1 });
  if (customers.data.length > 0) {
    return customers.data[0].id;
  }
  const customer = await stripe.customers.create({
    email,
    metadata: { supabaseUserId: userId },
  });
  return customer.id;
}
