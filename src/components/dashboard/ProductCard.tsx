"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, ShoppingBag, TrendingUp, Bookmark } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatNumber, formatPercent, trendLabel } from "@/lib/utils";
import type { TikTokProduct } from "@/types";

interface ProductCardProps {
  product: TikTokProduct;
  rank?: number;
  onSave?: (id: string) => void;
  saved?: boolean;
}

const trendBadgeVariant = {
  hot: "danger",
  rising: "warning",
  steady: "success",
  cooling: "default",
} as const;

export function ProductCard({ product, rank, onSave, saved }: ProductCardProps) {
  const trend = trendLabel(product.trendScore);

  return (
    <Card padded={false} className="overflow-hidden transition-shadow hover:shadow-md">
      <Link href={`/dashboard/products/${product.id}`} className="block">
        <div className="relative aspect-square w-full bg-gray-100">
          {product.thumbnailUrl ? (
            <Image
              src={product.thumbnailUrl}
              alt={product.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ShoppingBag className="h-12 w-12 text-gray-300" />
            </div>
          )}
          {rank && (
            <div className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs font-bold text-white">
              {rank}
            </div>
          )}
          <Badge
            variant={trendBadgeVariant[trend]}
            className="absolute right-2 top-2 capitalize"
          >
            {trend}
          </Badge>
        </div>
      </Link>

      <div className="p-4">
        <Link href={`/dashboard/products/${product.id}`}>
          <p className="line-clamp-2 text-sm font-medium text-gray-900 hover:text-brand-600">
            {product.title}
          </p>
        </Link>

        <p className="mt-1 text-xs text-gray-500">{product.shopName}</p>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-base font-bold text-gray-900">
            {formatCurrency(product.price, product.currency)}
          </span>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span>{product.rating.toFixed(1)}</span>
            <span>({formatNumber(product.reviewCount)})</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>{formatNumber(product.salesCount)} sold</span>
          </div>
          <div className="flex items-center gap-1 text-green-600 font-medium">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>{formatPercent(product.commissionRate)} comm.</span>
          </div>
        </div>

        {onSave && (
          <button
            onClick={() => onSave(product.id)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-gray-200 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            <Bookmark
              className={`h-3.5 w-3.5 ${saved ? "fill-brand-600 text-brand-600" : ""}`}
            />
            {saved ? "Saved" : "Save"}
          </button>
        )}
      </div>
    </Card>
  );
}
