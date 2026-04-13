"use client";

import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ProductCard } from "@/components/dashboard/ProductCard";
import { Bookmark, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { SavedProduct } from "@/types";

export default function SavedPage() {
  const [saved, setSaved] = useState<SavedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("saved_products")
        .select("*")
        .eq("user_id", user.id)
        .order("saved_at", { ascending: false });

      setSaved(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleRemove(savedId: string) {
    const supabase = createClient();
    await supabase.from("saved_products").delete().eq("id", savedId);
    setSaved((prev) => prev.filter((s) => s.id !== savedId));
  }

  return (
    <div>
      <DashboardHeader
        title="Saved Products"
        subtitle={`${saved.length} product${saved.length !== 1 ? "s" : ""} saved`}
      />

      <div className="p-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-xl bg-gray-200" />
            ))}
          </div>
        ) : saved.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-24 text-center">
            <Bookmark className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-500">No saved products yet</p>
            <p className="mt-1 text-xs text-gray-400">
              Click the bookmark icon on any product to save it here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {saved.map((item) => (
              <div key={item.id} className="relative group">
                <ProductCard product={item.productData} />
                <button
                  onClick={() => handleRemove(item.id)}
                  className="absolute right-2 top-2 hidden rounded-full bg-white/90 p-1.5 text-red-500 shadow group-hover:flex hover:bg-red-50"
                  title="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
