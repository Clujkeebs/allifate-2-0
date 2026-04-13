import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  TrendingUp,
  Zap,
  BarChart2,
  ShieldCheck,
  ArrowRight,
  Star,
  Search,
  Bookmark,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white px-4 pb-24 pt-20 text-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(236,72,153,0.15),rgba(255,255,255,0))]" />
        <div className="mx-auto max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
            <Zap className="h-3 w-3" /> Now with AI-powered analysis
          </span>
          <h1 className="mt-6 text-5xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-6xl">
            Find <span className="text-brand-600">winning products</span>
            <br />before they go viral
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-gray-600">
            Allifate scans TikTok Shop in real time to surface trending products with high commission
            potential — so you can promote them first.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-brand-700"
            >
              Start for free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              View pricing
            </Link>
          </div>
          <p className="mt-4 text-xs text-gray-400">No credit card required. Free plan available.</p>
        </div>

        {/* Mock dashboard preview */}
        <div className="mx-auto mt-16 max-w-4xl overflow-hidden rounded-2xl border border-gray-200 shadow-2xl">
          <div className="flex items-center gap-1.5 border-b border-gray-200 bg-gray-100 px-4 py-2.5">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-yellow-400" />
            <span className="h-3 w-3 rounded-full bg-green-400" />
            <span className="ml-4 text-xs text-gray-400">app.allifate.com/dashboard</span>
          </div>
          <div className="grid grid-cols-4 gap-3 bg-white p-6">
            {[
              { label: "Products Scanned", value: "14,820", color: "text-brand-600" },
              { label: "Trending Now", value: "342", color: "text-orange-500" },
              { label: "Avg. Commission", value: "18.4%", color: "text-green-600" },
              { label: "Saved Products", value: "87", color: "text-blue-600" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-gray-100 p-4 text-left">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-y border-gray-100 bg-gray-50 py-10">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Trusted by 3,000+ TikTok Shop affiliates
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6">
            {[4.9, 4.8, 5.0, 4.7, 4.9].map((rating, i) => (
              <div key={i} className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className="h-4 w-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
                <span className="ml-1 text-sm font-medium text-gray-700">{rating}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Everything you need to dominate TikTok Shop
            </h2>
            <p className="mt-4 text-gray-600">
              Stop guessing. Start knowing which products will convert.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <div className={`inline-flex rounded-xl p-3 ${f.iconBg}`}>
                  <f.icon className={`h-6 w-6 ${f.iconColor}`} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-500">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-gray-50 py-24">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">How it works</h2>
          <p className="mt-4 text-gray-600">From sign-up to your first winning product in minutes.</p>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.title} className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">
                  {i + 1}
                </div>
                <h3 className="mt-4 text-base font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-sm text-gray-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-600 py-20 text-center text-white">
        <div className="mx-auto max-w-xl px-4">
          <h2 className="text-3xl font-bold">Ready to find your next viral product?</h2>
          <p className="mt-4 text-brand-100">
            Join 3,000+ affiliates already using Allifate to stay ahead of the curve.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3 text-sm font-semibold text-brand-700 shadow transition-colors hover:bg-brand-50"
          >
            Get started free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

const features = [
  {
    title: "Real-Time Trending Feed",
    description: "See which products are spiking in sales right now, updated every hour.",
    icon: TrendingUp,
    iconBg: "bg-brand-50",
    iconColor: "text-brand-600",
  },
  {
    title: "AI Product Analyzer",
    description: "Get instant AI scoring on demand potential, competition level, and commission ROI.",
    icon: Zap,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    title: "Deep Analytics",
    description: "Track price history, sales velocity, and commission rate changes over time.",
    icon: BarChart2,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    title: "Smart Product Search",
    description: "Filter by category, price range, commission rate, and trend score.",
    icon: Search,
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    title: "Save & Organize",
    description: "Bookmark products and organize them into lists for easy content planning.",
    icon: Bookmark,
    iconBg: "bg-yellow-50",
    iconColor: "text-yellow-600",
  },
  {
    title: "Verified Data",
    description: "All data sourced directly from TikTok Shop via official API integrations.",
    icon: ShieldCheck,
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
  },
];

const steps = [
  {
    title: "Create your free account",
    description: "Sign up in 30 seconds. No credit card needed to get started.",
  },
  {
    title: "Browse trending products",
    description: "Explore our curated feed of high-potential TikTok Shop products.",
  },
  {
    title: "Analyze & promote",
    description: "Get AI insights, save your picks, and start earning commissions.",
  },
];
