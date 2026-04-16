"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Search,
  Bookmark,
  User,
  LogOut,
  ChevronRight,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navItems = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/dashboard/trending",
    label: "Trending",
    icon: Flame,
  },
  {
    href: "/dashboard/analyzer",
    label: "Analyzer",
    icon: Search,
  },
  {
    href: "/dashboard/saved",
    label: "Saved",
    icon: Bookmark,
  },
  {
    href: "/dashboard/account",
    label: "Account",
    icon: User,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
          <TrendingUp className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-gray-900">Allifate</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  active ? "text-brand-600" : "text-gray-400"
                )}
              />
              {item.label}
              {active && (
                <ChevronRight className="ml-auto h-3.5 w-3.5 text-brand-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="border-t border-gray-200 p-4">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <LogOut className="h-4 w-4 text-gray-400" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
