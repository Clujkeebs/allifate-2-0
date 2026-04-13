// ─── TikTok Shop / Product types ────────────────────────────────────────────

export interface TikTokProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  thumbnailUrl: string;
  videoUrl?: string;
  salesCount: number;
  commissionRate: number;
  rating: number;
  reviewCount: number;
  shopName: string;
  shopId: string;
  tags: string[];
  trendScore: number;
  createdAt: string;
}

export interface TrendingProduct extends TikTokProduct {
  rank: number;
  growthRate: number;
  peakTime: string;
}

export interface ProductAnalysis {
  product: TikTokProduct;
  score: number;
  potential: "high" | "medium" | "low";
  insights: string[];
  competitors: TikTokProduct[];
  priceRange: { min: number; max: number };
  demandTrend: "rising" | "stable" | "declining";
  recommendedCommission: number;
}

// ─── Supabase DB types ───────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  stripeCustomerId: string | null;
  subscriptionStatus: SubscriptionStatus;
  subscriptionTier: SubscriptionTier;
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "free";

export type SubscriptionTier = "free" | "starter" | "pro" | "enterprise";

export interface SavedProduct {
  id: string;
  userId: string;
  productId: string;
  productData: TikTokProduct;
  notes: string | null;
  savedAt: string;
}

export interface ScanHistory {
  id: string;
  userId: string;
  query: string;
  resultsCount: number;
  scannedAt: string;
}

// ─── Stripe types ────────────────────────────────────────────────────────────

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: "month" | "year";
  stripePriceId: string;
  features: string[];
  highlighted: boolean;
  tier: SubscriptionTier;
}

// ─── API response types ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
