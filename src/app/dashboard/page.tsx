import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import {
  TrendingUp,
  ShoppingBag,
  Bookmark,
  BarChart2,
  ArrowUpRight,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard Overview" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] ?? "there";

  const stats = [
    {
      label: "Products Scanned",
      value: "14,820",
      change: "+320 today",
      changeType: "up" as const,
      icon: ShoppingBag,
      iconBg: "bg-brand-50",
      iconColor: "text-brand-600",
    },
    {
      label: "Trending Now",
      value: "342",
      change: "+18 since yesterday",
      changeType: "up" as const,
      icon: TrendingUp,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-500",
    },
    {
      label: "Avg. Commission",
      value: "18.4%",
      change: "+0.6% this week",
      changeType: "up" as const,
      icon: BarChart2,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      label: "Saved Products",
      value: "87",
      change: "View list",
      changeType: "neutral" as const,
      icon: Bookmark,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
  ];

  const recentActivity = [
    { action: "Product scanned", product: "Portable Blender 500ml", time: "2 min ago", badge: "hot" },
    { action: "Product saved", product: "LED Strip Lights (5m)", time: "14 min ago", badge: "rising" },
    { action: "Analysis run", product: "Magnetic Phone Mount", time: "1 hr ago", badge: "steady" },
    { action: "Product scanned", product: "Knee Compression Sleeve", time: "2 hr ago", badge: "rising" },
    { action: "Product saved", product: "Mini Projector HD", time: "3 hr ago", badge: "hot" },
  ] as const;

  return (
    <div>
      <DashboardHeader
        title={`Good morning, ${firstName}`}
        subtitle="Here's what's happening on TikTok Shop today."
      />

      <div className="p-6 space-y-6">
        <StatsGrid stats={stats} />

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <Link
                href="/dashboard/analyzer"
                className="flex items-center gap-1 text-xs text-brand-600 hover:underline"
              >
                Analyze <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <div className="space-y-3">
              {recentActivity.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                >
                  <div>
                    <p className="text-xs font-medium text-gray-900">{item.product}</p>
                    <p className="text-xs text-gray-500">{item.action}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        item.badge === "hot"
                          ? "danger"
                          : item.badge === "rising"
                          ? "warning"
                          : "success"
                      }
                    >
                      {item.badge}
                    </Badge>
                    <span className="text-xs text-gray-400">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex flex-col items-start gap-2 rounded-xl border border-gray-100 p-4 transition-colors hover:border-brand-200 hover:bg-brand-50"
                >
                  <div className={`rounded-lg p-2 ${action.iconBg}`}>
                    <action.icon className={`h-4 w-4 ${action.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{action.label}</p>
                    <p className="text-xs text-gray-500">{action.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

const quickActions = [
  {
    label: "Browse Trending",
    description: "See what's hot right now",
    href: "/dashboard/trending",
    icon: TrendingUp,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-500",
  },
  {
    label: "Analyze Product",
    description: "Search and score any product",
    href: "/dashboard/analyzer",
    icon: BarChart2,
    iconBg: "bg-brand-50",
    iconColor: "text-brand-600",
  },
  {
    label: "View Saved",
    description: "Your bookmarked products",
    href: "/dashboard/saved",
    icon: Bookmark,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    label: "Account",
    description: "Manage plan & settings",
    href: "/dashboard/account",
    icon: ShoppingBag,
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
  },
];
