import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTrendingProducts } from "@/lib/rapidapi";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

  try {
    const products = await getTrendingProducts(category, limit);
    return NextResponse.json({ data: products });
  } catch (err) {
    console.error("[products/trending]", err);
    return NextResponse.json(
      { error: "Failed to fetch trending products." },
      { status: 500 }
    );
  }
}
