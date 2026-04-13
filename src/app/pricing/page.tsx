import Link from "next/link";
import { Check, Zap } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PRICING_PLANS } from "@/lib/stripe";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 py-20">
        <div className="mx-auto max-w-6xl px-4">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Start free. Upgrade when you&apos;re ready to scale.
            </p>
          </div>

          {/* Plans grid */}
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-2xl border p-6 shadow-sm",
                  plan.highlighted
                    ? "border-brand-500 bg-brand-600 text-white shadow-brand-200 shadow-xl ring-1 ring-brand-500"
                    : "border-gray-200 bg-white"
                )}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-yellow-900">
                      <Zap className="h-3 w-3" /> Most Popular
                    </span>
                  </div>
                )}

                <div>
                  <p
                    className={cn(
                      "text-sm font-semibold uppercase tracking-wider",
                      plan.highlighted ? "text-brand-200" : "text-gray-500"
                    )}
                  >
                    {plan.name}
                  </p>
                  <p
                    className={cn(
                      "mt-2 text-sm",
                      plan.highlighted ? "text-brand-100" : "text-gray-500"
                    )}
                  >
                    {plan.description}
                  </p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span
                      className={cn(
                        "text-4xl font-extrabold",
                        plan.highlighted ? "text-white" : "text-gray-900"
                      )}
                    >
                      ${plan.price}
                    </span>
                    {plan.price > 0 && (
                      <span
                        className={cn(
                          "text-sm",
                          plan.highlighted ? "text-brand-200" : "text-gray-500"
                        )}
                      >
                        /mo
                      </span>
                    )}
                  </div>
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check
                        className={cn(
                          "mt-0.5 h-4 w-4 flex-shrink-0",
                          plan.highlighted ? "text-brand-200" : "text-green-500"
                        )}
                      />
                      <span className={plan.highlighted ? "text-brand-100" : "text-gray-600"}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  {plan.price === 0 ? (
                    <Link
                      href="/signup"
                      className={cn(
                        "block rounded-xl py-2.5 text-center text-sm font-semibold transition-colors",
                        "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      Get started free
                    </Link>
                  ) : (
                    <PlanCheckoutButton
                      planId={plan.id}
                      highlighted={plan.highlighted}
                      planName={plan.name}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="mt-24">
            <h2 className="text-center text-2xl font-bold text-gray-900">
              Frequently asked questions
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {faqs.map((faq) => (
                <div key={faq.q}>
                  <h3 className="font-semibold text-gray-900">{faq.q}</h3>
                  <p className="mt-2 text-sm text-gray-500">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function PlanCheckoutButton({
  planId,
  highlighted,
  planName,
}: {
  planId: string;
  highlighted: boolean;
  planName: string;
}) {
  return (
    <Link
      href={`/signup?plan=${planId}`}
      className={cn(
        "block rounded-xl py-2.5 text-center text-sm font-semibold transition-colors",
        highlighted
          ? "bg-white text-brand-700 hover:bg-brand-50"
          : "bg-brand-600 text-white hover:bg-brand-700"
      )}
    >
      Get {planName}
    </Link>
  );
}

const faqs = [
  {
    q: "Can I cancel anytime?",
    a: "Yes — cancel with one click from your account settings. You keep access until the end of your billing period.",
  },
  {
    q: "Is there a free trial?",
    a: "The Free plan has no time limit. Paid plans include a 7-day free trial, no credit card required.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit cards via Stripe. Enterprise customers can pay by invoice.",
  },
  {
    q: "Can I switch plans later?",
    a: "Absolutely. Upgrade or downgrade anytime. Upgrades take effect immediately; downgrades apply at the next billing cycle.",
  },
  {
    q: "What is a 'product scan'?",
    a: "A scan fetches real-time data for a single TikTok Shop product — price, sales velocity, commission rate, and trend score.",
  },
  {
    q: "Do you offer team or agency pricing?",
    a: "The Enterprise plan includes up to 10 team seats. Need more? Contact us for custom pricing.",
  },
];
