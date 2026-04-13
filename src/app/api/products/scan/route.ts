import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchProducts } from "@/lib/rapidapi";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const keyword = searchParams.get("keyword") ?? "";
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Math.min(Number(searchParams.get("pageSize") ?? 20), 50);
  const sortBy = (searchParams.get("sortBy") ?? "sales") as "sales" | "commission" | "price" | "rating";
  const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
  const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
  const minCommission = searchParams.get("minCommission")
    ? Number(searchParams.get("minCommission"))
    : undefined;

  if (!keyword) {
    return NextResponse.json({ error: "keyword is required" }, { status: 400 });
  }

  try {
    const products = await searchProducts({
      keyword,
      page,
      pageSize,
      sortBy,
      minPrice,
      maxPrice,
      minCommission,
    });

    // Log scan to history
    await supabase.from("scan_history").insert({
      user_id: user.id,
      query: keyword,
      results_count: products.length,
    });

    return NextResponse.json({
      data: products,
      total: products.length,
      page,
      pageSize,
      hasMore: products.length === pageSize,
    });
  } catch (err) {
    console.error("[products/scan]", err);
    return NextResponse.json(
      { error: "Failed to scan products." },
      { status: 500 }
    );
  }
}
