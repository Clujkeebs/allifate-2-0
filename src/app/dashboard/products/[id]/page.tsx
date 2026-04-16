import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Star,
  ShoppingBag,
  TrendingUp,
  Tag,
  Store,
  ExternalLink,
} from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getProductById } from "@/lib/rapidapi";
import { formatCurrency, formatNumber, formatPercent, trendLabel } from "@/lib/utils";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Product ${id}` };
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const product = await getProductById(id).catch(() => null);

  if (!product) notFound();

  const trend = trendLabel(product.trendScore);
  const trendVariant = {
    hot: "danger",
    rising: "warning",
    steady: "success",
    cooling: "default",
  } as const;

  return (
    <div>
      <DashboardHeader title="Product Detail" />

      <div className="p-6 space-y-6 max-w-5xl">
        <Link
          href="/dashboard/trending"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to trending
        </Link>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
            {product.thumbnailUrl ? (
              <Image
                src={product.thumbnailUrl}
                alt={product.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <ShoppingBag className="h-20 w-20 text-gray-300" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant={trendVariant[trend]} className="capitalize">{trend}</Badge>
                {product.category && (
                  <Badge variant="default">{product.category}</Badge>
                )}
              </div>
              <h1 className="mt-3 text-2xl font-bold text-gray-900">{product.title}</h1>
              <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
                <Store className="h-4 w-4" />
                <span>{product.shopName}</span>
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-gray-900">
                {formatCurrency(product.price, product.currency)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatBlock
                icon={Star}
                label="Rating"
                value={`${product.rating.toFixed(1)} (${formatNumber(product.reviewCount)})`}
                iconColor="text-yellow-500"
              />
              <StatBlock
                icon={ShoppingBag}
                label="Units Sold"
                value={formatNumber(product.salesCount)}
                iconColor="text-blue-500"
              />
              <StatBlock
                icon={TrendingUp}
                label="Commission Rate"
                value={formatPercent(product.commissionRate)}
                iconColor="text-green-500"
              />
              <StatBlock
                icon={Tag}
                label="Trend Score"
                value={`${product.trendScore}/100`}
                iconColor="text-brand-500"
              />
            </div>

            {product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <a
              href={`https://www.tiktok.com/t/shop/product/${product.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
            >
              View on TikTok Shop <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <p className="text-sm leading-relaxed text-gray-600">{product.description}</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatBlock({
  icon: Icon,
  label,
  value,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  iconColor: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
      <Icon className={`h-5 w-5 shrink-0 ${iconColor}`} />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
