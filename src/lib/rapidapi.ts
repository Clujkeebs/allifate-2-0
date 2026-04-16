import axios from "axios";
import type { TikTokProduct, TrendingProduct } from "@/types";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY!;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST ?? "tiktok-shop4.p.rapidapi.com";

const rapidapi = axios.create({
  baseURL: `https://${RAPIDAPI_HOST}`,
  headers: {
    "x-rapidapi-key": RAPIDAPI_KEY,
    "x-rapidapi-host": RAPIDAPI_HOST,
  },
});

export interface SearchProductsParams {
  keyword: string;
  page?: number;
  pageSize?: number;
  sortBy?: "sales" | "commission" | "price" | "rating";
  minPrice?: number;
  maxPrice?: number;
  minCommission?: number;
}

export async function searchProducts(
  params: SearchProductsParams
): Promise<TikTokProduct[]> {
  const response = await rapidapi.get("/product/search", {
    params: {
      keyword: params.keyword,
      page: params.page ?? 1,
      page_size: params.pageSize ?? 20,
      sort_by: params.sortBy ?? "sales",
      min_price: params.minPrice,
      max_price: params.maxPrice,
      min_commission_rate: params.minCommission,
    },
  });
  return normalizeProducts(response.data?.data?.products ?? []);
}

export async function getTrendingProducts(
  category?: string,
  limit = 20
): Promise<TrendingProduct[]> {
  const response = await rapidapi.get("/product/trending", {
    params: { category, limit },
  });
  const raw: RawProduct[] = response.data?.data?.products ?? [];
  return raw.map((p, i) => ({
    ...normalizeProduct(p),
    rank: i + 1,
    growthRate: p.growth_rate ?? 0,
    peakTime: p.peak_time ?? new Date().toISOString(),
  }));
}

export async function getProductById(
  productId: string
): Promise<TikTokProduct | null> {
  const response = await rapidapi.get("/product/detail", {
    params: { product_id: productId },
  });
  const raw = response.data?.data?.product;
  return raw ? normalizeProduct(raw) : null;
}

// ─── Normalizers ─────────────────────────────────────────────────────────────

interface RawProduct {
  id?: string;
  product_id?: string;
  title?: string;
  description?: string;
  price?: number | string;
  currency?: string;
  category_name?: string;
  cover?: string;
  image_url?: string;
  video_url?: string;
  sold_count?: number;
  sales_count?: number;
  commission_rate?: number;
  rating?: number;
  review_count?: number;
  shop_name?: string;
  shop_id?: string;
  tags?: string[];
  trend_score?: number;
  growth_rate?: number;
  peak_time?: string;
  created_time?: string;
}

function normalizeProduct(raw: RawProduct): TikTokProduct {
  return {
    id: raw.id ?? raw.product_id ?? "",
    title: raw.title ?? "",
    description: raw.description ?? "",
    price: parseFloat(String(raw.price ?? 0)),
    currency: raw.currency ?? "USD",
    category: raw.category_name ?? "",
    thumbnailUrl: raw.cover ?? raw.image_url ?? "",
    videoUrl: raw.video_url,
    salesCount: raw.sold_count ?? raw.sales_count ?? 0,
    commissionRate: raw.commission_rate ?? 0,
    rating: raw.rating ?? 0,
    reviewCount: raw.review_count ?? 0,
    shopName: raw.shop_name ?? "",
    shopId: raw.shop_id ?? "",
    tags: raw.tags ?? [],
    trendScore: raw.trend_score ?? 0,
    createdAt: raw.created_time ?? new Date().toISOString(),
  };
}

function normalizeProducts(raws: RawProduct[]): TikTokProduct[] {
  return raws.map(normalizeProduct);
}
