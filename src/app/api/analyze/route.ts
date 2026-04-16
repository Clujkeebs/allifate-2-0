import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchProducts } from "@/lib/rapidapi";
import type { ProductAnalysis } from "@/types";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const query: string = body.query?.trim() ?? "";

  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  try {
    const [primary, competitors] = await Promise.all([
      searchProducts({ keyword: query, pageSize: 1, sortBy: "sales" }),
      searchProducts({ keyword: query, pageSize: 8, sortBy: "commission" }),
    ]);

    if (primary.length === 0) {
      return NextResponse.json(
        { error: "No products found for that query." },
        { status: 404 }
      );
    }

    const product = primary[0];
    const score = Math.round(
      product.trendScore * 0.4 +
        Math.min(product.commissionRate * 2, 30) +
        Math.min((product.salesCount / 10_000) * 20, 20) +
        (product.rating / 5) * 10
    );

    const demandTrend =
      product.trendScore >= 70
        ? "rising"
        : product.trendScore >= 40
        ? "stable"
        : "declining";

    const potential =
      score >= 70 ? "high" : score >= 45 ? "medium" : "low";

    const insights: string[] = [];
    if (product.commissionRate >= 15)
      insights.push(`High commission rate of ${product.commissionRate.toFixed(1)}% — good ROI for affiliates.`);
    if (product.salesCount >= 5000)
      insights.push(`Proven demand with ${product.salesCount.toLocaleString()} units sold.`);
    if (product.trendScore >= 75)
      insights.push("Trending strongly — act quickly before market becomes saturated.");
    if (product.rating >= 4.5)
      insights.push(`Excellent customer rating (${product.rating.toFixed(1)}/5) reduces return risk.`);
    if (product.price < 30)
      insights.push("Low price point under $30 drives impulse purchases on TikTok.");
    if (insights.length === 0)
      insights.push("Moderate opportunity — consider testing with a small content push first.");

    const analysis: ProductAnalysis = {
      product,
      score: Math.min(score, 100),
      potential,
      insights,
      competitors: competitors.filter((c) => c.id !== product.id).slice(0, 4),
      priceRange: {
        min: Math.min(...competitors.map((c) => c.price)),
        max: Math.max(...competitors.map((c) => c.price)),
      },
      demandTrend,
      recommendedCommission: Math.max(product.commissionRate, 10),
    };

    return NextResponse.json({ data: analysis });
  } catch (err) {
    console.error("[analyze]", err);
    return NextResponse.json(
      { error: "Failed to analyze product. Please try again." },
      { status: 500 }
    );
  }
}
