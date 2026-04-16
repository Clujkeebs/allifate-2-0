"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ProductCard } from "@/components/dashboard/ProductCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Search, Zap, TrendingUp, ShieldCheck, AlertCircle } from "lucide-react";
import type { ProductAnalysis } from "@/types";

export default function AnalyzerPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProductAnalysis | null>(null);
  const [error, setError] = useState("");

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error ?? "Analysis failed. Please try again.");
      } else {
        setResult(json.data);
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  const potentialColors = {
    high: "success",
    medium: "warning",
    low: "danger",
  } as const;

  return (
    <div>
      <DashboardHeader
        title="Product Analyzer"
        subtitle="Search any TikTok Shop product for an AI-powered opportunity score"
      />

      <div className="p-6 space-y-6">
        {/* Search form */}
        <Card>
          <form onSubmit={handleAnalyze} className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Enter product name, URL, or keyword…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button type="submit" loading={loading} className="flex items-center gap-2 shrink-0">
              <Zap className="h-4 w-4" />
              Analyze
            </Button>
          </form>
          <p className="mt-2 text-xs text-gray-400">
            Examples: &quot;portable blender&quot;, &quot;LED strip lights&quot;, &quot;knee sleeve&quot;
          </p>
        </Card>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            <div className="h-48 animate-pulse rounded-2xl bg-gray-200" />
            <div className="grid gap-4 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-200" />
              ))}
            </div>
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div className="space-y-6">
            {/* Score overview */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50">
                    <Zap className="h-6 w-6 text-brand-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Opportunity Score</p>
                    <p className="text-2xl font-bold text-gray-900">{result.score}/100</p>
                  </div>
                </div>
              </Card>
              <Card>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Demand Trend</p>
                    <p className="text-lg font-bold capitalize text-gray-900">
                      {result.demandTrend}
                    </p>
                  </div>
                </div>
              </Card>
              <Card>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50">
                    <ShieldCheck className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Potential</p>
                    <Badge variant={potentialColors[result.potential]} className="mt-1 capitalize">
                      {result.potential}
                    </Badge>
                  </div>
                </div>
              </Card>
            </div>

            {/* Product card + insights */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <ProductCard product={result.product} />
              </div>
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>AI Insights</CardTitle>
                  </CardHeader>
                  <ul className="space-y-2">
                    {result.insights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                          {i + 1}
                        </span>
                        {insight}
                      </li>
                    ))}
                  </ul>
                </Card>

                {result.competitors.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Similar Products</CardTitle>
                    </CardHeader>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {result.competitors.slice(0, 4).map((p) => (
                        <ProductCard key={p.id} product={p} />
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && !error && (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-24 text-center">
            <Search className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-500">Enter a product to analyze</p>
            <p className="mt-1 text-xs text-gray-400">
              We&apos;ll score its potential, demand trend, and commission ROI
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
