"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ProductCard } from "@/components/dashboard/ProductCard";
import { Button } from "@/components/ui/Button";
import { Flame, RefreshCw } from "lucide-react";
import type { TrendingProduct } from "@/types";

const CATEGORIES = ["All", "Beauty", "Health", "Home", "Fashion", "Electronics", "Sports", "Food"];

export default function TrendingPage() {
  const [products, setProducts] = useState<TrendingProduct[]>([]);
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const fetchTrending = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (category !== "All") params.set("category", category);
      const res = await fetch(`/api/products/trending?${params}`);
      const json = await res.json();
      setProducts(json.data ?? []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  function toggleSave(id: string) {
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div>
      <DashboardHeader
        title="Trending Products"
        subtitle="Updated every hour from TikTok Shop"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={fetchTrending}
          loading={loading}
          className="flex items-center gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </DashboardHeader>

      <div className="p-6 space-y-6">
        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                category === cat
                  ? "bg-brand-600 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {cat === "All" && <Flame className="mr-1 inline h-3 w-3 text-orange-400" />}
              {cat}
            </button>
          ))}
        </div>

        {/* Products grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-xl bg-gray-200" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
            <Flame className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-500">No trending products found</p>
            <p className="mt-1 text-xs text-gray-400">Try a different category or refresh</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                rank={i + 1}
                onSave={toggleSave}
                saved={savedIds.has(product.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
