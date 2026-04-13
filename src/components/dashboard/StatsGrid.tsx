import { type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface StatItem {
  label: string;
  value: string;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
}

interface StatsGridProps {
  stats: StatItem[];
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</p>
              {stat.change && (
                <p
                  className={cn(
                    "mt-1 text-xs font-medium",
                    stat.changeType === "up" && "text-green-600",
                    stat.changeType === "down" && "text-red-600",
                    stat.changeType === "neutral" && "text-gray-500"
                  )}
                >
                  {stat.change}
                </p>
              )}
            </div>
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                stat.iconBg ?? "bg-brand-50"
              )}
            >
              <stat.icon
                className={cn("h-5 w-5", stat.iconColor ?? "text-brand-600")}
              />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
